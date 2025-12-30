/**
 * Gemini Function Calling Tools Definition
 * Fase 3: Smart Path - AI processa tudo que Guardrails e Regex rejeitaram
 */

export const GEMINI_TOOLS = [
    {
        name: 'registrar_evento',
        description: 'Registra um evento de saúde (glicemia, insulina ou refeição) no banco de dados. Use APENAS quando o usuário AFIRMAR que algo aconteceu (passado). NÃO use para perguntas ou dúvidas.',
        parameters: {
            type: 'object',
            properties: {
                tipo: {
                    type: 'string',
                    enum: ['glicemia', 'insulina', 'refeicao'],
                    description: 'Tipo do evento a ser registrado'
                },
                glicemia: {
                    type: 'object',
                    properties: {
                        valor: {
                            type: 'number',
                            description: 'Valor da glicemia em mg/dL (20-600)'
                        },
                        contexto: {
                            type: 'string',
                            enum: ['Fasting', 'Pre-Meal', 'Post-Meal', 'Correction'],
                            description: 'Contexto da medição'
                        }
                    },
                    required: ['valor']
                },
                insulina: {
                    type: 'object',
                    properties: {
                        unidades: {
                            type: 'number',
                            description: 'Unidades de insulina aplicadas (0.5-100)'
                        },
                        tipo_insulina: {
                            type: 'string',
                            enum: ['basal', 'rapida', 'mista'],
                            description: 'Tipo de insulina'
                        },
                        contexto: {
                            type: 'string',
                            description: 'Contexto da aplicação (ex: Café, Almoço, Correção)'
                        }
                    },
                    required: ['unidades']
                },
                refeicao: {
                    type: 'object',
                    properties: {
                        descricao: {
                            type: 'string',
                            description: 'Descrição da refeição'
                        },
                        carboidratos: {
                            type: 'number',
                            description: 'Gramas de carboidratos estimados'
                        },
                        calorias: {
                            type: 'number',
                            description: 'Calorias estimadas'
                        },
                        insulina_sugerida: {
                            type: 'number',
                            description: 'Unidades de insulina sugeridas baseado nos carboidratos'
                        }
                    },
                    required: ['descricao']
                }
            },
            required: ['tipo']
        }
    },
    {
        name: 'consultar_historico',
        description: 'Consulta o histórico de eventos do usuário para responder perguntas como "Já tomei insulina hoje?" ou "Qual foi minha última glicemia?"',
        parameters: {
            type: 'object',
            properties: {
                tipo: {
                    type: 'string',
                    enum: ['glicemia', 'insulina', 'refeicao', 'todos'],
                    description: 'Tipo de evento a consultar'
                },
                periodo: {
                    type: 'string',
                    enum: ['hoje', 'ontem', 'semana', 'mes'],
                    default: 'hoje',
                    description: 'Período de tempo a consultar'
                },
                limite: {
                    type: 'number',
                    default: 10,
                    description: 'Número máximo de registros a retornar'
                }
            },
            required: ['tipo']
        }
    },
    {
        name: 'register_basal',
        description: 'Registra que o usuário aplicou sua insulina basal/lenta do dia (ex: Lantus, Tresiba, Basaglar, NPH, Levemir). Use APENAS quando o usuário CONFIRMAR que aplicou a basal. Exemplos: "Tomei a basal", "Apliquei minha lenta", "Já fiz a basal de hoje".',
        parameters: {
            type: 'object',
            properties: {
                periodo: {
                    type: 'string',
                    enum: ['morning', 'night', 'auto'],
                    default: 'auto',
                    description: 'Período da dose (manhã ou noite). Use "auto" para detectar automaticamente baseado no horário atual.'
                }
            },
            required: []
        }
    }
];

/**
 * Mapeia período para filtro de data
 * ⚠️ CORREÇÃO CRÍTICA: Edge Functions rodam em UTC, mas usuário está em America/Sao_Paulo
 */
export function getPeriodFilter(periodo: string): Date {
    // Obter horário atual no Brasil (UTC-3)
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    // Início do dia no Brasil (00:00:00)
    const startOfDay = new Date(brazilTime.getFullYear(), brazilTime.getMonth(), brazilTime.getDate());

    switch (periodo) {
        case 'hoje':
            return startOfDay;
        case 'ontem':
            const yesterday = new Date(startOfDay);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        case 'semana':
            const weekAgo = new Date(brazilTime);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return weekAgo;
        case 'mes':
            const monthAgo = new Date(brazilTime);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return monthAgo;
        default:
            return startOfDay;
    }
}

/**
 * Mapeia tipo para nome da tabela
 */
export function getTableName(tipo: string): string {
    switch (tipo) {
        case 'glicemia':
            return 'glucose_readings';
        case 'insulina':
            return 'insulin_history';
        case 'refeicao':
            return 'meal_history';
        default:
            return 'glucose_readings';
    }
}
