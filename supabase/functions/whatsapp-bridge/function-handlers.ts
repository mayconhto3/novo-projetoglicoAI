/**
 * Function Call Handlers para Gemini AI
 * Processa chamadas de função registrar_evento e consultar_historico
 */

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

        // REFEIÇÃO
        if (tipo === 'refeicao' && refeicao) {
            // Idempotency Check (Check description)
            const isDuplicate = await checkIdempotency('meal_history', { description: refeicao.descricao });
            if (isDuplicate) {
                console.log(`[Function Call] Refeição duplicada ignorada: ${refeicao.descricao}`);
                return { success: true, message: `Refeição já registrada anteriormente.` };
            }

            const { data, error } = await supabase
                .from('meal_history')
                .insert({
                    user_id: userId,
                    description: refeicao.descricao,
                    carbs: refeicao.carboidratos || null,
                    calories: refeicao.calorias || null,
                    insulin_suggested: refeicao.insulina_sugerida || null,
                    meal_time: inferMealTime(new Date()), // ✅ CORREÇÃO: meal_time (não meal_label)
                    created_at: new Date().toISOString(),
                    favorite: false
                });

            if (error) {
                console.error('[Function Call] Erro ao registrar refeição:', error);
                throw error;
            }

            console.log(`[Function Call] Refeição registrada: ${refeicao.descricao}`);
            return { success: true, message: `Refeição registrada: ${refeicao.descricao}` };
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
    getTableName: (tipo: string) => string
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
