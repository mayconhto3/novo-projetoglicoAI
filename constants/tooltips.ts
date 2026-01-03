// OS-16: Tooltip Library
// Responsabilidade: Conteúdo educativo para campos técnicos
// Data: 2026-01-03

export interface TooltipContent {
    title: string;
    content: string;
    example?: string;
    learnMore?: string;
}

export const TOOLTIPS: Record<string, TooltipContent> = {
    // ============================================================================
    // INSULINA E CÁLCULOS
    // ============================================================================

    ratioIC: {
        title: "O que é Ratio IC?",
        content: "É a quantidade de carboidratos que 1 unidade de insulina consegue cobrir. Também chamado de 'Relação Insulina-Carboidrato'.",
        example: "Ratio 1:10 significa que 1 unidade de insulina cobre 10g de carboidrato. Se você comer 50g de carboidratos, precisará de 5 unidades (50 ÷ 10 = 5).",
        learnMore: "Seu médico define esse valor baseado no seu peso, sensibilidade e horário do dia."
    },

    isf: {
        title: "O que é Sensibilidade (ISF)?",
        content: "É quanto 1 unidade de insulina reduz sua glicemia. Também chamado de 'Fator de Sensibilidade à Insulina' ou 'Fator de Correção'.",
        example: "ISF 50 significa que 1 unidade baixa 50 mg/dL. Se sua glicemia está em 200 mg/dL e sua meta é 100 mg/dL, você precisa baixar 100 mg/dL. Dose de correção: 100 ÷ 50 = 2 unidades.",
        learnMore: "Esse valor varia ao longo do dia. Geralmente é maior pela manhã (mais sensível)."
    },

    iob: {
        title: "O que é Insulina Ativa (IOB)?",
        content: "É a quantidade de insulina ainda atuando no seu corpo de doses anteriores. A insulina rápida age por 3-5 horas.",
        example: "Se você aplicou 5 unidades há 2 horas, pode ter 2 unidades ainda ativas. O GlucoAI desconta isso automaticamente para evitar hipoglicemia.",
        learnMore: "Nunca aplique insulina de correção sem considerar a IOB!"
    },

    // ============================================================================
    // METAS GLICÊMICAS
    // ============================================================================

    targetGlucosePreMeal: {
        title: "Meta Glicêmica Pré-Refeição",
        content: "É o valor ideal de glicemia ANTES de comer. Usado para calcular dose de correção.",
        example: "Meta comum: 80-120 mg/dL. Se sua glicemia está em 150 mg/dL antes do almoço, você precisa de correção.",
        learnMore: "Seu médico define essa meta baseado no seu controle glicêmico."
    },

    targetGlucosePostMeal: {
        title: "Meta Glicêmica Pós-Refeição",
        content: "É o valor ideal de glicemia 2 horas DEPOIS de comer. Usado para avaliar se a dose de insulina foi adequada.",
        example: "Meta comum: 120-180 mg/dL. Se 2h após comer você está em 220 mg/dL, a dose pode ter sido insuficiente.",
        learnMore: "Valores acima de 180 mg/dL indicam que você pode precisar ajustar o Ratio IC."
    },

    // ============================================================================
    // TIPOS DE INSULINA
    // ============================================================================

    basalInsulin: {
        title: "O que é Insulina Basal?",
        content: "É a insulina de ação lenta (12-24h) que mantém sua glicemia estável ao longo do dia, mesmo sem comer.",
        example: "Exemplos: Lantus, Tresiba, Levemir, Degludeca. Geralmente aplicada 1-2 vezes ao dia (manhã e/ou noite).",
        learnMore: "Não cobre refeições! Serve apenas para manter a glicemia basal."
    },

    bolusInsulin: {
        title: "O que é Insulina Bolus?",
        content: "É a insulina de ação rápida (3-5h) usada nas refeições para cobrir os carboidratos e fazer correções.",
        example: "Exemplos: Humalog, Novorapid, Apidra, Fiasp. Aplicada antes de cada refeição.",
        learnMore: "Deve ser aplicada 10-15 minutos antes de comer para melhor controle."
    },

    // ============================================================================
    // DADOS PESSOAIS
    // ============================================================================

    weight: {
        title: "Por que precisamos do seu peso?",
        content: "O peso influencia diretamente a sensibilidade à insulina e os cálculos de dose.",
        example: "Pessoas com mais peso geralmente precisam de doses maiores. Crianças precisam de doses menores.",
        learnMore: "Mantenha esse dado atualizado para cálculos precisos."
    },

    height: {
        title: "Por que precisamos da sua altura?",
        content: "A altura, junto com o peso, ajuda a calcular o IMC e entender melhor seu perfil metabólico.",
        example: "Altura 1.70m + Peso 70kg = IMC 24.2 (peso normal).",
        learnMore: "Usado apenas para análises estatísticas e personalização."
    },

    diabetesType: {
        title: "Tipo de Diabetes",
        content: "Existem diferentes tipos de diabetes, cada um com características específicas de tratamento.",
        example: "Tipo 1: Autoimune, sempre precisa de insulina. Tipo 2: Resistência à insulina, pode ou não usar insulina. Gestacional: Durante a gravidez.",
        learnMore: "O tipo influencia as sugestões e cálculos do GlucoAI."
    },

    // ============================================================================
    // PRECISÃO DE INSULINA (OS-09)
    // ============================================================================

    insulinMethod: {
        title: "Método de Aplicação de Insulina",
        content: "O dispositivo que você usa para aplicar insulina determina a precisão das doses.",
        example: "Caneta: Geralmente 1.0u de precisão. Bomba de Insulina: Pode ter 0.1u ou 0.05u de precisão.",
        learnMore: "Isso afeta como o GlucoAI arredonda as doses sugeridas."
    },

    insulinStep: {
        title: "Precisão da Dose (Step)",
        content: "É o menor incremento de dose que seu dispositivo consegue aplicar.",
        example: "Precisão 1.0u: Só pode aplicar 3u, 4u, 5u (não 3.5u). Precisão 0.5u: Pode aplicar 3.0u, 3.5u, 4.0u.",
        learnMore: "Crianças e pessoas muito sensíveis geralmente usam 0.5u."
    },

    // ============================================================================
    // HORÁRIOS E PERÍODOS
    // ============================================================================

    mealTimes: {
        title: "Horários das Refeições",
        content: "Informar os horários habituais das refeições ajuda o GlucoAI a identificar automaticamente o período do dia.",
        example: "Café: 7h, Almoço: 12h, Jantar: 19h. Se você enviar uma foto às 12:30, o GlucoAI sabe que é almoço e usa o Ratio IC correto.",
        learnMore: "Você pode ter Ratios diferentes para cada refeição."
    },

    basalTimes: {
        title: "Horários da Basal",
        content: "Quando você costuma aplicar a insulina basal (lenta).",
        example: "Manhã: 8h (Lantus 20u), Noite: 22h (Lantus 15u). Ou apenas 1x ao dia (Tresiba 30u às 8h).",
        learnMore: "O GlucoAI pode lembrá-lo se você esquecer de aplicar."
    }
};

// Helper para buscar tooltip
export const getTooltip = (key: string): TooltipContent | null => {
    return TOOLTIPS[key] || null;
};

// Lista de campos que têm tooltip
export const FIELDS_WITH_TOOLTIP = Object.keys(TOOLTIPS);
