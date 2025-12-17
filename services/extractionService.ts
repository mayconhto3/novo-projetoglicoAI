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
}

export interface InsulinExtraction {
    units: number;
    type: 'rapid' | 'basal' | 'mixed' | 'unknown';
    confidence: number;
    method: 'regex' | 'nlp' | 'ai';
}

export interface MealExtraction {
    description: string;
    confidence: number;
    method: 'regex' | 'nlp' | 'ai' | 'image';
    hasImage: boolean;
}

export interface ExtractionResult {
    glucose?: GlucoseExtraction;
    insulin?: InsulinExtraction;
    meal?: MealExtraction;
    confidence: number;
    primaryType: 'glucose' | 'insulin' | 'meal' | 'unknown';
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

    // Testar cada padrão em ordem de especificidade
    for (let i = 0; i < GLUCOSE_PATTERNS.length; i++) {
        const match = normalized.match(GLUCOSE_PATTERNS[i]);

        if (match) {
            const value = parseInt(match[1]);

            // Validar range realista (20-600 mg/dL)
            if (value >= 20 && value <= 600) {
                // Confiança decresce com padrões menos específicos
                const confidence = 0.95 - (i * 0.08);

                return {
                    value,
                    unit: 'mg/dL',
                    confidence: Math.max(confidence, 0.6),
                    method: 'regex'
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

                return {
                    units,
                    type,
                    confidence: Math.max(confidence, 0.6),
                    method: 'regex'
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

    // Se tem imagem, alta prioridade
    if (hasImage) {
        return {
            description: 'Refeição (via foto)',
            confidence: 0.95,
            method: 'image',
            hasImage: true
        };
    }

    // Testar padrões
    for (let i = 0; i < MEAL_PATTERNS.length; i++) {
        const match = normalized.match(MEAL_PATTERNS[i]);

        if (match) {
            const description = match[1]?.trim() || normalized;
            const confidence = 0.88 - (i * 0.12);

            return {
                description,
                confidence: Math.max(confidence, 0.5),
                method: 'regex',
                hasImage: false
            };
        }
    }

    // Fallback: verificar se menciona alimentos comuns
    const hasFoodMention = COMMON_FOODS.some(food => normalized.includes(food));
    if (hasFoodMention) {
        return {
            description: normalized,
            confidence: 0.6,
            method: 'nlp',
            hasImage: false
        };
    }

    return null;
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

export function analyzeMessage(text: string, hasImage: boolean = false): ExtractionResult {
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
        primaryType
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
