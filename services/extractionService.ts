/**
 * Natural Language Extraction Service
 * 
 * 3-Layer Strategy:
 * 1. Regex Patterns (95% cases, 0 tokens, <1ms)
 * 2. NLP Lite (3% cases, 0 tokens, <5ms)
 * 3. AI Fallback (2% cases, uses tokens, ~500ms)
 */

export interface GlucoseExtraction {
    value: number;
    unit: 'mg/dL';
    confidence: number;
    method: 'regex' | 'nlp' | 'ai';
    needsConfirmation?: boolean; // ✅ FASE 2: Padrões fracos precisam confirmação
}

export interface InsulinExtraction {
    units: number;
    type: 'rapid' | 'basal' | 'mixed' | 'unknown';
    confidence: number;
    method: 'regex' | 'nlp' | 'ai';
    needsConfirmation?: boolean; // ✅ FASE 2: Padrões fracos precisam confirmação
}

export interface MealExtraction {
    description: string;
    confidence: number;
    method: 'regex' | 'nlp' | 'ai' | 'image';
    hasImage: boolean;
    needsConfirmation?: boolean; // ✅ FASE 2: Padrões fracos precisam confirmação
}

export interface ExtractionResult {
    glucose?: GlucoseExtraction;
    insulin?: InsulinExtraction;
    meal?: MealExtraction;
    confidence: number;
    primaryType: 'glucose' | 'insulin' | 'meal' | 'unknown';
    wasBlocked?: boolean; // ✅ NOVO: Indica se foi bloqueado por guardrail
    blockReason?: string; // ✅ NOVO: Motivo do bloqueio
}

// ============================================================================
// PORTÃO 1: GUARDRAILS (KILL SWITCH)
// ============================================================================

/**
 * Detecta se a mensagem é ambígua (pergunta ou dúvida).
 * Se TRUE, PROIBIDO acionar Regex. Vai direto para IA.
 * 
 * PRIORIDADE ZERO: Eliminar falsos positivos que geram responsabilidade médica.
 * Exemplo crítico: "Eu deveria tomar 4 unidades?" → TRUE (não salva nada)
 */
export function isAmbiguous(text: string): { isAmbiguous: boolean; reason?: string } {
    const normalized = text.toLowerCase().trim();

    // Regra 1: Contém ponto de interrogação
    if (normalized.includes('?')) {
        return { isAmbiguous: true, reason: 'contains_question_mark' };
    }

    // Regra 2: Palavras de incerteza (responsabilidade médica)
    const uncertaintyWords = [
        'devo', 'deveria', 'deverá',
        'posso', 'poderia', 'poderá',
        'será', 'seria',
        'acho', 'acha',
        'talvez', 'pode ser',
        'não sei', 'nao sei',
        'dúvida', 'duvida',
        'pergunta',
        'como faço', 'como faco',
        'o que faço', 'o que faco'
    ];

    for (const word of uncertaintyWords) {
        if (normalized.includes(word)) {
            return { isAmbiguous: true, reason: `uncertainty_word: "${word}"` };
        }
    }

    // Regra 3: Mensagem muito longa (>50 chars) = contexto complexo
    // Exceção: Se for apenas uma lista de alimentos, não bloquear
    if (text.length > 50) {
        // Verificar se não é apenas lista de comida
        const hasComplexContext = /\s(e|com|mas|porém|porque|pois|então)\s/i.test(text);
        if (hasComplexContext) {
            return { isAmbiguous: true, reason: 'complex_context (>50 chars with conjunctions)' };
        }
    }

    return { isAmbiguous: false };
}

// ============================================================================
// GLUCOSE EXTRACTION
// ============================================================================

const GLUCOSE_PATTERNS = [
    // Padrão 1: Contexto completo "minha glicemia atual é 201"
    /(?:minha?|meu|a)\s*(?:glicemia|glicose|glucose|gli|açúcar)\s*(?:atual|agora|hoje|da\s*vez)?\s*(?:está?|tá|é|foi|deu|marcou|mediu?)\s*(?:em|de|a)?\s*(\d{2,3})/i,

    // Padrão 2: Verbo + número "medí 180", "testei 150"
    /(?:medí|medi|testei|chequei|verifiquei|conferi)\s*(?:e|a)?\s*(?:glicemia|glicose|glucose|gli)?\s*(?:está?|tá|é|foi|deu|marcou)?\s*(\d{2,3})/i,

    // Padrão 3: Palavra-chave + estado + número "glicose tá 150"
    /(?:glicemia|glicose|glucose|gli|açúcar)\s*(?:está?|tá|é|foi|deu|marcou)\s*(?:em|de|a)?\s*(\d{2,3})/i,

    // Padrão 4: Número + palavra-chave "201 de glicemia"
    /(\d{2,3})\s*(?:de|mg\/dl|mg)?\s*(?:glicemia|glicose|glucose|gli|açúcar)/i,

    // Padrão 5: Estado + número (contexto curto) "está 180", "deu 95"
    /(?:está?|tá|é|foi|deu|marcou)\s*(\d{2,3})\s*(?:mg\/dl|mg)?$/i,

    // Padrão 6: Apenas número (se mensagem muito curta)
    /^(\d{2,3})$/
];

export function extractGlucose(text: string): GlucoseExtraction | null {
    const normalized = text.toLowerCase().trim();

    // ✅ PORTÃO 1: Verificar ambiguidade ANTES de processar
    const ambiguityCheck = isAmbiguous(text);
    if (ambiguityCheck.isAmbiguous) {
        console.log(`[Guardrail] Blocked glucose extraction: "${text}" - Reason: ${ambiguityCheck.reason}`);
        return null; // Deixa para IA processar
    }

    // Testar cada padrão em ordem de especificidade
    for (let i = 0; i < GLUCOSE_PATTERNS.length; i++) {
        const match = normalized.match(GLUCOSE_PATTERNS[i]);

        if (match) {
            const value = parseInt(match[1]);

            // Validar range realista (20-600 mg/dL)
            if (value >= 20 && value <= 600) {
                // Confiança decresce com padrões menos específicos
                const confidence = 0.95 - (i * 0.08);

                // ✅ FASE 2: Padrões fracos (>=4) ou apenas número (5) precisam confirmação
                // Padrão 5 (índice 5): /^(\d{2,3})$/ - apenas número
                const needsConfirmation = i >= 4;

                if (needsConfirmation) {
                    console.log(`[Regex Hardening] Weak pattern match (index ${i}): "${text}" - Needs confirmation`);
                }

                return {
                    value,
                    unit: 'mg/dL',
                    confidence: Math.max(confidence, 0.6),
                    method: 'regex',
                    needsConfirmation
                };
            }
        }
    }

    return null;
}

// ============================================================================
// INSULIN EXTRACTION
// ============================================================================

const INSULIN_PATTERNS = [
    // Padrão 1: Verbo + número + unidade "apliquei 10u"
    /(?:apliquei|tomei|dei|fiz|usei|coloquei)\s*(\d{1,2}(?:[.,]\d)?)\s*(?:u|un|unidades?|ui)?\s*(?:de)?\s*(?:insulina|rápida|lenta|basal|nph|regular|lantus|novorapid)?/i,

    // Padrão 2: Número + unidade + tipo "10u de rápida"
    /(\d{1,2}(?:[.,]\d)?)\s*(?:u|un|unidades?|ui)\s*(?:de)?\s*(?:insulina|rápida|lenta|basal|nph|regular)?/i,

    // Padrão 3: Tipo + número "rápida 8u", "basal de 20"
    /(?:insulina|rápida|lenta|basal|nph|regular)\s*(?:de|foi)?\s*(\d{1,2}(?:[.,]\d)?)\s*(?:u|un|unidades?|ui)?/i,

    // Padrão 4: Apenas número + u "10u", "5.5u"
    /(\d{1,2}(?:[.,]\d)?)\s*u(?:nidades?)?$/i
];

export function extractInsulin(text: string): InsulinExtraction | null {
    const normalized = text.toLowerCase().trim();

    // ✅ PORTÃO 1: Verificar ambiguidade ANTES de processar
    const ambiguityCheck = isAmbiguous(text);
    if (ambiguityCheck.isAmbiguous) {
        console.log(`[Guardrail] Blocked insulin extraction: "${text}" - Reason: ${ambiguityCheck.reason}`);
        return null; // Deixa para IA processar
    }

    for (let i = 0; i < INSULIN_PATTERNS.length; i++) {
        const match = normalized.match(INSULIN_PATTERNS[i]);

        if (match) {
            // Normalizar decimal (trocar vírgula por ponto)
            const unitsStr = match[1].replace(',', '.');
            const units = parseFloat(unitsStr);

            // Validar range (0.5-100 unidades)
            if (units >= 0.5 && units <= 100) {
                // Detectar tipo de insulina
                let type: InsulinExtraction['type'] = 'unknown';
                if (/basal|lenta|nph|lantus|tresiba/i.test(normalized)) {
                    type = 'basal';
                } else if (/rápida|regular|novorapid|humalog|apidra|fiasp/i.test(normalized)) {
                    type = 'rapid';
                } else if (/mist|mix|premix/i.test(normalized)) {
                    type = 'mixed';
                } else if (i <= 1) {
                    // Se padrão específico mas sem tipo, assumir rápida
                    type = 'rapid';
                }

                const confidence = 0.92 - (i * 0.1);

                // ✅ FASE 2: Padrões fracos (>=2) precisam confirmação
                // Padrão 3 (índice 3): /(\d{1,2}(?:[.,]\d)?)\s*u(?:nidades?)?$/ - apenas número+u
                const needsConfirmation = i >= 2;

                if (needsConfirmation) {
                    console.log(`[Regex Hardening] Weak insulin pattern (index ${i}): "${text}" - Needs confirmation`);
                }

                return {
                    units,
                    type,
                    confidence: Math.max(confidence, 0.6),
                    method: 'regex',
                    needsConfirmation
                };
            }
        }
    }

    return null;
}

// ============================================================================
// MEAL EXTRACTION
// ============================================================================

const MEAL_PATTERNS = [
    // Padrão 1: Verbos de alimentação + descrição
    /(?:comi|almocei|jantei|tomei\s+café|lanchei|bebi|ceia)\s+(.+)/i,

    // Padrão 2: Tipo de refeição + descrição
    /(?:café\s+da\s+manhã|almoço|jantar|lanche|ceia)\s*(?:foi|era|tinha|de)?\s*(.+)/i,

    // Padrão 3: Alimentos comuns (captura tudo)
    /(arroz|feijão|carne|frango|peixe|salada|pão|macarrão|pizza|hambúrguer|frutas?|verduras?|legumes?|batata|ovo|queijo|leite|iogurte|sopa|sanduíche).*/i,

    // Padrão 4: Contexto de foto
    /(?:foto|imagem|tirei\s+foto|mandei\s+foto|enviei\s+foto)\s*(?:da|do|de)?\s*(?:minha|meu)?\s*(?:refeição|comida|almoço|jantar|café|lanche)?/i
];

const COMMON_FOODS = [
    'arroz', 'feijão', 'carne', 'frango', 'peixe', 'salada', 'pão', 'macarrão',
    'pizza', 'hambúrguer', 'fruta', 'verdura', 'legume', 'batata', 'ovo',
    'queijo', 'leite', 'iogurte', 'sopa', 'sanduíche', 'bolo', 'doce'
];

export function extractMeal(text: string, hasImage: boolean = false): MealExtraction | null {
    const normalized = text.toLowerCase().trim();

    // Se tem imagem, alta prioridade (bypass guardrail)
    if (hasImage) {
        return {
            description: 'Refeição (via foto)',
            confidence: 0.95,
            method: 'image',
            hasImage: true,
            needsConfirmation: false // Imagem é evidência forte
        };
    }

    // ✅ PORTÃO 1: Verificar ambiguidade ANTES de processar
    const ambiguityCheck = isAmbiguous(text);
    if (ambiguityCheck.isAmbiguous) {
        console.log(`[Guardrail] Blocked meal extraction: "${text}" - Reason: ${ambiguityCheck.reason}`);
        return null; // Deixa para IA processar
    }

    // Testar padrões
    for (let i = 0; i < MEAL_PATTERNS.length; i++) {
        const match = normalized.match(MEAL_PATTERNS[i]);

        if (match) {
            const description = match[1]?.trim() || normalized;
            const confidence = 0.88 - (i * 0.12);

            // ✅ FASE 2: Padrões fracos (>=2) precisam confirmação
            const needsConfirmation = i >= 2;

            if (needsConfirmation) {
                console.log(`[Regex Hardening] Weak meal pattern (index ${i}): "${text}" - Needs confirmation`);
            }

            return {
                description,
                confidence: Math.max(confidence, 0.5),
                method: 'regex',
                hasImage: false,
                needsConfirmation
            };
        }
    }

    // Fallback: verificar se menciona alimentos comuns
    const hasFoodMention = COMMON_FOODS.some(food => normalized.includes(food));
    if (hasFoodMention) {
        // ✅ FASE 2: NLP sempre precisa confirmação (baixa confiança)
        console.log(`[Regex Hardening] NLP food detection: "${text}" - Needs confirmation`);

        return {
            description: normalized,
            confidence: 0.6,
            method: 'nlp',
            hasImage: false,
            needsConfirmation: true // NLP é menos confiável
        };
    }

    return null;
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

export function analyzeMessage(text: string, hasImage: boolean = false): ExtractionResult {
    // ✅ PORTÃO 1: Verificar ambiguidade no nível de orquestração
    const ambiguityCheck = isAmbiguous(text);
    if (ambiguityCheck.isAmbiguous) {
        console.log(`[Guardrail] Message blocked at orchestration level: "${text}" - Reason: ${ambiguityCheck.reason}`);
        return {
            confidence: 0,
            primaryType: 'unknown',
            wasBlocked: true,
            blockReason: ambiguityCheck.reason
        };
    }

    const glucose = extractGlucose(text);
    const insulin = extractInsulin(text);
    const meal = extractMeal(text, hasImage);

    // Determinar tipo primário baseado em confiança
    let primaryType: ExtractionResult['primaryType'] = 'unknown';
    let maxConfidence = 0;

    if (glucose && glucose.confidence > maxConfidence) {
        primaryType = 'glucose';
        maxConfidence = glucose.confidence;
    }

    if (insulin && insulin.confidence > maxConfidence) {
        primaryType = 'insulin';
        maxConfidence = insulin.confidence;
    }

    if (meal && meal.confidence > maxConfidence) {
        primaryType = 'meal';
        maxConfidence = meal.confidence;
    }

    return {
        glucose: glucose || undefined,
        insulin: insulin || undefined,
        meal: meal || undefined,
        confidence: maxConfidence,
        primaryType,
        wasBlocked: false
    };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function isValidGlucose(value: number): boolean {
    return value >= 20 && value <= 600;
}

export function isValidInsulin(units: number): boolean {
    return units >= 0.5 && units <= 100;
}

export function shouldUseAIFallback(result: ExtractionResult, messageLength: number): boolean {
    // Usar IA apenas se:
    // 1. Nenhuma extração bem-sucedida
    // 2. OU confiança muito baixa
    // 3. E mensagem não trivial

    const hasNoExtractions = !result.glucose && !result.insulin && !result.meal;
    const hasLowConfidence = result.confidence < 0.5;
    const isNonTrivial = messageLength > 10;

    return (hasNoExtractions || hasLowConfidence) && isNonTrivial;
}
