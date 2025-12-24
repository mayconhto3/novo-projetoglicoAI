// supabase/functions/whatsapp-bridge/services/mealService.ts
// Especialista em Processamento de Refeições
// Responsabilidade: Prevenir duplicatas e enriquecer registros existentes

export interface MealData {
    meal_time: string;
    description: string;
    image_url?: string | null;
    carbs?: number;
    calories?: number;
    insulin_suggested?: number;
    ai_feedback?: string | null;
}

export interface MealResult {
    success: boolean;
    message: string;
    isDuplicate?: boolean;
    isUpdate?: boolean;
    data?: any;
}

/**
 * Registra uma refeição com proteção contra duplicatas
 * 
 * Estratégia:
 * 1. Verifica se existe refeição recente (janela de 10 minutos)
 * 2. Se existe e nova descrição é diferente → ENRIQUECE registro existente
 * 3. Se existe e descrição é igual → BLOQUEIA duplicata
 * 4. Se não existe → CRIA novo registro
 * 
 * Casos de Uso:
 * - Usuário envia foto → IA detecta "macarrão com molho"
 * - Usuário envia texto "Era macarrão à bolonhesa" → ENRIQUECE registro
 * - Usuário reenvia mesma foto → BLOQUEIA duplicata
 * 
 * @param supabase - Cliente Supabase
 * @param userId - ID do usuário
 * @param mealData - Dados da refeição
 * @returns Resultado da operação
 */
export async function registerMeal(
    supabase: any,
    userId: string,
    mealData: MealData
): Promise<MealResult> {
    console.log('[MealService] Processando registro de refeição...');

    // 1. Definição da Janela de "Dedup" (10 minutos)
    // Se o usuário mandar algo 10 min depois, assumimos que é uma nova refeição ou correção.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // 2. Busca Inteligente
    // Verifica se já existe uma refeição registrada por este usuário nesta janela de tempo
    const { data: recentMeals, error: searchError } = await supabase
        .from('meal_history')
        .select('id, description, assistant_comment, estimated_carbs, estimated_calories')
        .eq('user_id', userId)
        .gte('created_at', tenMinutesAgo)
        .limit(1);

    if (searchError) {
        console.error('[MealService] Erro ao buscar duplicatas:', searchError);
        // Em caso de erro de leitura, prosseguimos para salvar (fail-safe)
    }

    // 3. Lógica de Bloqueio e Enriquecimento
    if (recentMeals && recentMeals.length > 0) {
        const existingMeal = recentMeals[0];
        console.log(`[MealService] Duplicata detectada (ID: ${existingMeal.id}).`);

        // CENÁRIO A: O novo dado tem uma descrição nova? (Ex: "Era macarrão")
        // Se a descrição nova não estiver contida na antiga, atualizamos a antiga.
        if (
            mealData.description &&
            (!existingMeal.description ||
                !existingMeal.description.includes(mealData.description))
        ) {
            console.log(
                '[MealService] Enriquecendo refeição existente com novos detalhes...'
            );
            const newDesc = existingMeal.description
                ? `${existingMeal.description} | Nota: ${mealData.description}`
                : mealData.description;

            const { error: updateError } = await supabase
                .from('meal_history')
                .update({ description: newDesc })
                .eq('id', existingMeal.id);

            if (updateError) {
                console.error('[MealService] Erro ao enriquecer refeição:', updateError);
                throw updateError;
            }

            return {
                success: true,
                message: 'Adicionei essa observação ao prato que você acabou de enviar! ✅',
                isUpdate: true,
                data: { ...existingMeal, description: newDesc },
            };
        }

        // CENÁRIO B: É apenas uma repetição exata ou a IA detectou a mesma coisa
        return {
            success: true,
            message: 'Já registrei essa refeição! 😉',
            isDuplicate: true,
            data: existingMeal,
        };
    }

    // 4. Salvar Nova Refeição (Se não for duplicata)
    console.log('[MealService] Registrando nova refeição...');
    const { data, error } = await supabase
        .from('meal_history')
        .insert([
            {
                user_id: userId,
                meal_time: mealData.meal_time,
                description: mealData.description,
                image_url: mealData.image_url,
                estimated_carbs: mealData.carbs,
                estimated_calories: mealData.calories,
                insulin_suggested: mealData.insulin_suggested,
                assistant_comment: mealData.ai_feedback,
            },
        ])
        .select()
        .single();

    if (error) {
        console.error('[MealService] Erro ao salvar refeição:', error);
        throw error;
    }

    return {
        success: true,
        message: `Refeição registrada! (${mealData.carbs || 0}g carb)`,
        data,
    };
}
