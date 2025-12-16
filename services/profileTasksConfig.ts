import { ProfileTaskKey, ProfileTaskMetadata } from '../types';

// Metadados das tarefas de completamento de perfil
export const PROFILE_TASK_METADATA: Record<ProfileTaskKey, ProfileTaskMetadata> = {
    basic_info: {
        key: 'basic_info',
        title: 'Informações Básicas',
        description: 'Nome, tipo de diabetes, insulina',
        xp_reward: 50,
        icon: '👤',
        priority: 1,
        fields: ['name', 'diabetesType', 'usesInsulin', 'phone']
    },
    insulin_details: {
        key: 'insulin_details',
        title: 'Detalhes da Insulina',
        description: 'Marcas, doses e horários',
        xp_reward: 50,
        icon: '💉',
        priority: 2,
        fields: ['basalInsulin', 'bolusInsulin', 'insulinDuration']
    },
    meal_schedule: {
        key: 'meal_schedule',
        title: 'Horários das Refeições',
        description: 'Café, almoço, jantar',
        xp_reward: 50,
        icon: '🍽️',
        priority: 3,
        fields: ['mealTimes', 'routineVariability']
    },
    lifestyle_habits: {
        key: 'lifestyle_habits',
        title: 'Hábitos de Vida',
        description: 'Exercícios, sono, estresse',
        xp_reward: 50,
        icon: '🏃',
        priority: 4,
        fields: ['exerciseFrequency', 'exerciseType', 'sleepQuality', 'stressLevel', 'smoker', 'alcoholConsumption']
    },
    medical_team: {
        key: 'medical_team',
        title: 'Equipe Médica',
        description: 'Endócrino, nutricionista',
        xp_reward: 50,
        icon: '👨‍⚕️',
        priority: 5,
        fields: ['hasEndocrinologist', 'hasNutritionist', 'consultationFrequency', 'doctorName']
    },
    emergency_contact: {
        key: 'emergency_contact',
        title: 'Contato de Emergência',
        description: 'Cuidador ou familiar',
        xp_reward: 50,
        icon: '🆘',
        priority: 6,
        fields: ['caregiver']
    },
    monitoring_setup: {
        key: 'monitoring_setup',
        title: 'Monitoramento',
        description: 'CGM, frequência de medição',
        xp_reward: 50,
        icon: '📊',
        priority: 7,
        fields: ['measurementFrequency', 'usesCGM', 'cgmModel']
    },
    diet_preferences: {
        key: 'diet_preferences',
        title: 'Preferências Alimentares',
        description: 'Dieta, contagem de carbos',
        xp_reward: 50,
        icon: '🥗',
        priority: 8,
        fields: ['dietType', 'carbCountingKnowledge', 'problematicFoods']
    }
};

// Helper para verificar se uma tarefa está completa baseado no perfil
export const isTaskComplete = (taskKey: ProfileTaskKey, profile: any): boolean => {
    const metadata = PROFILE_TASK_METADATA[taskKey];

    // Verificar se todos os campos da tarefa estão preenchidos
    return metadata.fields.every(field => {
        const value = profile[field];

        // Verificar se o valor existe e não está vazio
        if (value === undefined || value === null || value === '') return false;

        // Para objetos, verificar se tem propriedades
        if (typeof value === 'object') {
            if (Array.isArray(value)) return value.length > 0;
            return Object.keys(value).length > 0 && Object.values(value).some(v => v !== '' && v !== null && v !== undefined);
        }

        return true;
    });
};

// Calcular porcentagem de completamento
export const calculateCompletionPercentage = (profile: any): number => {
    const tasks = Object.keys(PROFILE_TASK_METADATA) as ProfileTaskKey[];
    const completedTasks = tasks.filter(taskKey => isTaskComplete(taskKey, profile));
    return Math.round((completedTasks.length / tasks.length) * 100);
};
