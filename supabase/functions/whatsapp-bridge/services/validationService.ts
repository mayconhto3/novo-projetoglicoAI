// supabase/functions/whatsapp-bridge/services/validationService.ts
// Especialista em Validação Médica
// Responsabilidade: Garantir integridade e segurança dos dados de saúde

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
    safeData?: any;
}

/**
 * Limites Médicos (Safety Guardrails)
 * 
 * Baseados em consenso médico e segurança do paciente:
 * - Glicemia: 20-600 mg/dL (abaixo de 20 = coma, acima de 600 = crise gravíssima)
 * - Insulina: 0.5-100 unidades (acima de 100 = provável erro de digitação)
 * - Carboidratos: 0-500g (acima de 500g numa refeição = improvável)
 * - Calorias: 0-5000 kcal (acima de 5000 = improvável numa refeição)
 */
const MEDICAL_LIMITS = {
    GLUCOSE: { MIN: 20, MAX: 600 },
    INSULIN: { MIN: 0.5, MAX: 100 },
    CARBS: { MIN: 0, MAX: 500 },
    CALORIES: { MIN: 0, MAX: 5000 }
};

/**
 * Valida valor de glicemia
 * 
 * Rejeita valores fora do range médico seguro (20-600 mg/dL)
 * 
 * @param value - Valor de glicemia em mg/dL
 * @returns Resultado da validação com mensagem de erro se inválido
 */
export function validateGlucose(value: number): ValidationResult {
    if (isNaN(value)) {
        return { isValid: false, error: "Valor de glicemia inválido" };
    }

    if (value < MEDICAL_LIMITS.GLUCOSE.MIN) {
        return {
            isValid: false,
            error: `Valor ${value} mg/dL muito baixo (Mínimo: ${MEDICAL_LIMITS.GLUCOSE.MIN} mg/dL). Verifique se digitou certo.`
        };
    }

    if (value > MEDICAL_LIMITS.GLUCOSE.MAX) {
        return {
            isValid: false,
            error: `Valor ${value} mg/dL muito alto (Máximo: ${MEDICAL_LIMITS.GLUCOSE.MAX} mg/dL). Verifique se digitou certo.`
        };
    }

    // Warnings para valores preocupantes (mas não bloqueantes)
    let warning;
    if (value < 70) {
        warning = "⚠️ Glicemia baixa! Considere consumir carboidratos rápidos.";
    } else if (value > 250) {
        warning = "⚠️ Glicemia alta! Considere correção com insulina.";
    }

    return { isValid: true, safeData: value, warning };
}

/**
 * Valida dose de insulina
 * 
 * Rejeita doses fora do range seguro (0.5-100 unidades)
 * Doses acima de 100u são provavelmente erros de digitação
 * 
 * @param units - Dose de insulina em unidades
 * @returns Resultado da validação com mensagem de erro se inválido
 */
export function validateInsulin(units: number): ValidationResult {
    if (isNaN(units)) {
        return { isValid: false, error: "Dose de insulina inválida" };
    }

    if (units < MEDICAL_LIMITS.INSULIN.MIN) {
        return {
            isValid: false,
            error: `Dose mínima é ${MEDICAL_LIMITS.INSULIN.MIN} unidades.`
        };
    }

    if (units > MEDICAL_LIMITS.INSULIN.MAX) {
        return {
            isValid: false,
            error: `Dose de ${units}u parece muito alta (Máximo: ${MEDICAL_LIMITS.INSULIN.MAX}u). Por segurança, não registrei. Verifique se digitou certo.`
        };
    }

    // Warning para doses altas (mas não bloqueantes)
    let warning;
    if (units > 20) {
        warning = "⚠️ Dose alta de insulina. Certifique-se de que está correto.";
    }

    return { isValid: true, safeData: units, warning };
}

/**
 * Valida dados de refeição
 * 
 * Verifica se carboidratos e calorias estão dentro de limites razoáveis
 * 
 * @param carbs - Carboidratos em gramas (opcional)
 * @param calories - Calorias (opcional)
 * @returns Resultado da validação com warning se valores suspeitos
 */
export function validateMeal(carbs?: number, calories?: number): ValidationResult {
    // Validação de carboidratos
    if (carbs !== undefined && carbs !== null) {
        if (isNaN(carbs)) {
            return { isValid: false, error: "Valor de carboidratos inválido" };
        }

        if (carbs < MEDICAL_LIMITS.CARBS.MIN) {
            return {
                isValid: false,
                error: "Carboidratos não podem ser negativos"
            };
        }

        if (carbs > MEDICAL_LIMITS.CARBS.MAX) {
            return {
                isValid: false,
                warning: `Atenção: ${carbs}g de carboidratos parece muito alto para uma refeição (Máximo razoável: ${MEDICAL_LIMITS.CARBS.MAX}g). Verifique se está correto.`
            };
        }
    }

    // Validação de calorias
    if (calories !== undefined && calories !== null) {
        if (isNaN(calories)) {
            return { isValid: false, error: "Valor de calorias inválido" };
        }

        if (calories < MEDICAL_LIMITS.CALORIES.MIN) {
            return {
                isValid: false,
                error: "Calorias não podem ser negativas"
            };
        }

        if (calories > MEDICAL_LIMITS.CALORIES.MAX) {
            return {
                isValid: false,
                warning: `Atenção: ${calories} calorias parece muito alto para uma refeição (Máximo razoável: ${MEDICAL_LIMITS.CALORIES.MAX}). Verifique se está correto.`
            };
        }
    }

    return { isValid: true };
}

/**
 * Valida insulina sugerida pela IA
 * 
 * Usa mesma validação de insulina manual, mas com mensagem diferente
 * 
 * @param units - Dose sugerida em unidades
 * @returns Resultado da validação
 */
export function validateSuggestedInsulin(units?: number): ValidationResult {
    if (units === undefined || units === null) {
        return { isValid: true }; // Opcional
    }

    const result = validateInsulin(units);

    if (!result.isValid) {
        return {
            isValid: false,
            error: `Dose sugerida de ${units}u parece incorreta. Não vou sugerir por segurança.`
        };
    }

    return result;
}
