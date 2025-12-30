/**
 * Function Call Handlers para Gemini AI
 * Processa chamadas de função registrar_evento e consultar_historico
 */

import { registerMeal } from './services/mealService.ts';
import { validateGlucose, validateInsulin } from './services/validationService.ts';

// ============================================================================
// HANDLER: REGISTRAR EVENTO
// ============================================================================

/**
 * Processa chamada da função registrar_evento
 * ⚠️ CORREÇÃO CRÍTICA 2: Usa meal_time (não meal_label) para consistência com schema
 */
export async function handleRegistrarEvento(
    args: any,
    userId: string,
    supabase: any,
    inferMealTime: (date: Date) => string
): Promise<any> {
    const { tipo, glicemia, insulina, refeicao } = args;

    // Helper: Check Idempotency (10 minutes window - aumentado de 2 para 10 min)
    const checkIdempotency = async (table: string, criteria: any) => {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        let query = supabase.from(table).select('id').eq('user_id', userId).gte('created_at', tenMinutesAgo);

        // Adjust for glucose table timestamp field
        if (table === 'glucose_readings') {
            query = supabase.from(table).select('id').eq('user_id', userId).gte('timestamp', tenMinutesAgo);
        }

        for (const key in criteria) {
            query = query.eq(key, criteria[key]);
        }

        const { data } = await query.limit(1);
        return data && data.length > 0;
    };

    try {
        // GLICEMIA
        if (tipo === 'glicemia' && glicemia) {
            // Validação de segurança
            const validation = validateGlucose(glicemia.valor);
            if (!validation.isValid) {
                console.log(`[Function Call] Glicemia rejeitada: ${validation.error}`);
                return { success: false, message: validation.error };
            }

            // Idempotency Check
            const isDuplicate = await checkIdempotency('glucose_readings', { value: glicemia.valor });
            if (isDuplicate) {
                console.log(`[Function Call] Glicemia duplicada ignorada: ${glicemia.valor}`);
                return { success: true, message: `Glicemia já registrada anteriormente: ${glicemia.valor} mg/dL` };
            }

            const { data, error } = await supabase
                .from('glucose_readings')
                .insert({
                    user_id: userId,
                    value: glicemia.valor,
                    type: glicemia.contexto || 'Correction',
                    timestamp: new Date().toISOString()
                });

            if (error) {
                console.error('[Function Call] Erro ao registrar glicemia:', error);
                throw error;
            }

            console.log(`[Function Call] Glicemia registrada: ${glicemia.valor} mg/dL`);
            return { success: true, message: `Glicemia registrada: ${glicemia.valor} mg/dL` };
        }

        // INSULINA
        if (tipo === 'insulina' && insulina) {
            // Validação de segurança
            const validation = validateInsulin(insulina.unidades);
            if (!validation.isValid) {
                console.log(`[Function Call] Insulina rejeitada: ${validation.error}`);
                return { success: false, message: validation.error };
            }

            // Idempotency Check
            const isDuplicate = await checkIdempotency('insulin_history', { units: insulina.unidades });
            if (isDuplicate) {
                console.log(`[Function Call] Insulina duplicada ignorada: ${insulina.unidades}`);
                return { success: true, message: `Insulina já registrada anteriormente: ${insulina.unidades}u` };
            }

            // Mapear tipo de insulina para formato do banco
            let insulinType = 'Bolus';
            if (insulina.tipo_insulina === 'basal') {
                insulinType = 'Basal';
            } else if (insulina.tipo_insulina === 'rapida') {
                insulinType = 'Bolus';
            }

            const { data, error } = await supabase
                .from('insulin_history')
                .insert({
                    user_id: userId,
                    units: insulina.unidades,
                    insulin_type: insulinType,
                    context: insulina.contexto || inferMealTime(new Date()),
                    created_at: new Date().toISOString(),
                    note: 'Registrado via IA'
                });

            if (error) {
                console.error('[Function Call] Erro ao registrar insulina:', error);
                throw error;
            }

            console.log(`[Function Call] Insulina registrada: ${insulina.unidades}u (${insulinType})`);
            return { success: true, message: `Insulina registrada: ${insulina.unidades}u` };
        }

        // REFEIÇÃO (Refatorada para usar Service)
        if (tipo === 'refeicao' && refeicao) {
            const mealResult = await registerMeal(supabase, userId, {
                meal_time: refeicao.horario || inferMealTime(new Date()),
                description: refeicao.descricao || 'Refeição registrada',
                image_url: null, // A URL da imagem geralmente vem do contexto global ou é tratada antes
                carbs: refeicao.carboidratos,
                calories: refeicao.calorias,
                insulin_suggested: refeicao.insulina_sugerida,
                ai_feedback: null // Ou passe o feedback se a IA gerou
            });

            console.log(`[Function Call] ${mealResult.message}`);
            return {
                success: true,
                message: mealResult.message,
                updated: mealResult.isUpdate,
                duplicate: mealResult.isDuplicate
            };
        }

        return { error: 'Tipo de evento inválido ou dados ausentes' };

    } catch (error: any) {
        console.error('[Function Call] Erro ao registrar evento:', error);
        return { error: error.message || 'Erro ao salvar no banco de dados' };
    }
}

// ============================================================================
// HANDLER: CONSULTAR HISTÓRICO
// ============================================================================

/**
 * Processa chamada da função consultar_historico
 */
export async function handleConsultarHistorico(
    args: any,
    userId: string,
    supabase: any,
    getPeriodFilter: (periodo: string) => Date,
    getTableName: (tipo: string) => string
): Promise<any> {
    const { tipo, periodo = 'hoje', limite = 10 } = args;

    try {
        const startDate = getPeriodFilter(periodo);

        console.log(`[Function Call] Consultando histórico: tipo=${tipo}, periodo=${periodo}, startDate=${startDate.toISOString()}`);

        // TODOS os tipos
        if (tipo === 'todos') {
            const [glucose, insulin, meals] = await Promise.all([
                supabase.from('glucose_readings')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('timestamp', startDate.toISOString())
                    .order('timestamp', { ascending: false })
                    .limit(limite),
                supabase.from('insulin_history')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(limite),
                supabase.from('meal_history')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(limite)
            ]);

            const result = {
                glicemia: glucose.data || [],
                insulina: insulin.data || [],
                refeicoes: meals.data || []
            };

            console.log(`[Function Call] Histórico completo: ${glucose.data?.length || 0} glicemias, ${insulin.data?.length || 0} insulinas, ${meals.data?.length || 0} refeições`);

            return result;
        }

        // Tipo específico
        const tableName = getTableName(tipo);
        const timeField = tipo === 'glicemia' ? 'timestamp' : 'created_at';

        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', userId)
            .gte(timeField, startDate.toISOString())
            .order(timeField, { ascending: false })
            .limit(limite);

        if (error) {
            console.error('[Function Call] Erro ao consultar histórico:', error);
            throw error;
        }

        console.log(`[Function Call] Histórico de ${tipo}: ${data?.length || 0} registros`);

        return { [tipo]: data || [] };

    } catch (error: any) {
        console.error('[Function Call] Erro ao consultar histórico:', error);
        return { error: error.message || 'Erro ao consultar banco de dados' };
    }
}

// ============================================================================
// PROCESSOR: PARALLEL FUNCTION CALLS
// ============================================================================

/**
 * Processa múltiplas chamadas de função (Parallel Function Calling)
 * ⚠️ CORREÇÃO CRÍTICA 3: Suporta múltiplas function calls na mesma resposta
 */
export async function processFunctionCalls(
    parts: any[],
    userId: string,
    supabase: any,
    inferMealTime: (date: Date) => string,
    getPeriodFilter: (periodo: string) => Date,
    getTableName: (tipo: string) => string,
    profile: any
): Promise<any[]> {
    const results = [];

    // Coletar todas as function calls de todos os parts
    const functionCalls = parts
        .filter(part => part.functionCall)
        .map(part => part.functionCall);

    if (functionCalls.length === 0) {
        return [];
    }

    console.log(`[Function Call] Processando ${functionCalls.length} chamada(s) de função`);

    // Executar todas as funções em paralelo com try-catch individual
    const promises = functionCalls.map(async (functionCall) => {
        const { name, args } = functionCall;

        try {
            if (name === 'registrar_evento') {
                return await handleRegistrarEvento(args, userId, supabase, inferMealTime);
            }

            if (name === 'consultar_historico') {
                return await handleConsultarHistorico(args, userId, supabase, getPeriodFilter, getTableName);
            }

            if (name === 'register_basal') {
                return await handleRegisterBasal(args, userId, supabase, profile);
            }

            return { error: `Função desconhecida: ${name}` };

        } catch (error: any) {
            console.error(`[Function Call] Erro ao processar ${name}:`, error);
            return { error: error.message || 'Erro ao processar função' };
        }
    });

    // Aguardar todas as funções (mesmo se uma falhar, outras continuam)
    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
        if (result.status === 'fulfilled') {
            results.push(result.value);
        } else {
            results.push({ error: result.reason?.message || 'Erro desconhecido' });
        }
    }

    return results;
}

// ============================================================================
// HANDLER: REGISTER BASAL (NOVA TOOL)
// ============================================================================

/**
 * Processa chamada da função register_basal
 * Registra a aplicação de insulina basal do usuário
 */
export async function handleRegisterBasal(
    args: any,
    userId: string,
    supabase: any,
    profile: any
): Promise<any> {
    const { periodo = 'auto' } = args;

    try {
        // Verificar se o usuário tem basal configurada
        if (!profile.usesInsulin || !profile.basalInsulin?.brand) {
            return {
                success: false,
                message: 'Você não tem insulina basal configurada no seu perfil.'
            };
        }

        const basal = profile.basalInsulin;
        const now = new Date();
        const currentHour = now.getHours();

        // Determinar período automaticamente se necessário
        let finalPeriod = periodo;
        if (periodo === 'auto') {
            // Manhã: 04:00 - 15:59, Noite: 16:00 - 03:59
            finalPeriod = (currentHour >= 4 && currentHour < 16) ? 'morning' : 'night';
        }

        // Selecionar dose e horário baseado no período
        let dose: number;
        let scheduledTime: string;
        let context: string;

        if (finalPeriod === 'morning') {
            if (!basal.morningDose) {
                return {
                    success: false,
                    message: 'Você não tem dose de basal da manhã configurada.'
                };
            }
            dose = basal.morningDose;
            scheduledTime = basal.morningTime || 'N/A';
            context = 'Basal Manhã';
        } else {
            if (!basal.nightDose) {
                return {
                    success: false,
                    message: 'Você não tem dose de basal da noite configurada.'
                };
            }
            dose = basal.nightDose;
            scheduledTime = basal.nightTime || 'N/A';
            context = 'Basal Noite';
        }

        // Verificar se já tomou hoje (idempotência)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: existingLog } = await supabase
            .from('insulin_history')
            .select('id, created_at')
            .eq('user_id', userId)
            .eq('insulin_type', 'Basal')
            .eq('context', context)
            .gte('created_at', todayStart.toISOString())
            .limit(1);

        if (existingLog && existingLog.length > 0) {
            const logTime = new Date(existingLog[0].created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return {
                success: false,
                message: `Você já registrou sua basal ${finalPeriod === 'morning' ? 'da manhã' : 'da noite'} hoje às ${logTime}.`
            };
        }

        // Inserir no banco
        const { error } = await supabase.from('insulin_history').insert({
            user_id: userId,
            units: dose,
            insulin_type: 'Basal',
            brand: basal.brand,
            context: context,
            taken_at: now.toISOString(),
            created_at: now.toISOString(),
            note: 'Registrado via WhatsApp (IA)'
        });

        if (error) throw error;

        // Retornar confirmação
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return {
            success: true,
            message: `✅ Registrado! ${dose}u de ${basal.brand} (${context}) às ${timeStr}.`
        };

    } catch (error: any) {
        console.error('[Register Basal] Erro:', error);
        return {
            success: false,
            message: 'Erro ao registrar basal. Tente novamente.'
        };
    }
}

