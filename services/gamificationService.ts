import { supabase } from './supabaseClient';
import { UserGamification, UserAchievement, Badge, ProfileTaskKey } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

// Curva de progressão de níveis (XP necessário para cada nível)
const LEVEL_CURVE = [
    0,      // Level 1
    100,    // Level 2
    250,    // Level 3
    500,    // Level 4
    850,    // Level 5
    1300,   // Level 6
    1850,   // Level 7
    2500,   // Level 8
    3250,   // Level 9
    4100,   // Level 10
    5050,   // Level 11
    6100,   // Level 12
    7250,   // Level 13
    8500,   // Level 14
    9850,   // Level 15
];

// XP por ação
export const XP_REWARDS = {
    WELCOME_BONUS: 50,
    GLUCOSE_ENTRY: 5,
    MEAL_ENTRY: 10,
    INSULIN_ENTRY: 10,
    PROFILE_SECTION: 50,
    DAILY_STREAK: 20,
    WEEKLY_STREAK: 100,
    TIR_TARGET: 50, // >70% por 24h
};

// Definição de badges
export const BADGE_DEFINITIONS: Badge[] = [
    {
        id: 'first_week',
        name: 'Primeira Semana',
        description: '7 dias de uso',
        icon: '⭐',
        criteria: { type: 'streak', target: 7 }
    },
    {
        id: 'streak_30',
        name: 'Mês de Ouro',
        description: '30 dias seguidos',
        icon: '🏆',
        criteria: { type: 'streak', target: 30 }
    },
    {
        id: 'glucose_50',
        name: 'Monitor Dedicado',
        description: '50 registros de glicemia',
        icon: '📊',
        criteria: { type: 'count', target: 50 }
    },
    {
        id: 'meal_50',
        name: 'Chef Consciente',
        description: '50 refeições registradas',
        icon: '🍽️',
        criteria: { type: 'count', target: 50 }
    },
    {
        id: 'tir_70',
        name: 'No Alvo',
        description: 'TIR >70% por 24h',
        icon: '🎯',
        criteria: { type: 'tir', target: 70 }
    },
    {
        id: 'level_10',
        name: 'Mestre',
        description: 'Alcançou nível 10',
        icon: '👑',
        criteria: { type: 'level', target: 10 }
    },
    {
        id: 'profile_complete',
        name: 'Perfil Completo',
        description: '100% do perfil preenchido',
        icon: '✅',
        criteria: { type: 'profile', target: 100 }
    },
];

// ============================================================================
// GAMIFICATION SERVICE
// ============================================================================

export class GamificationService {

    // Inicializar gamificação para novo usuário
    static async initializeGamification(userId: string): Promise<UserGamification | null> {
        try {
            const { data, error } = await supabase
                .from('user_gamification')
                .insert({
                    user_id: userId,
                    level: 1,
                    xp: XP_REWARDS.WELCOME_BONUS,
                    total_xp: XP_REWARDS.WELCOME_BONUS,
                    streak_days: 1,
                    longest_streak: 1,
                    last_activity_date: new Date().toISOString().split('T')[0],
                })
                .select()
                .single();

            if (error) {
                console.error('Error initializing gamification:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error initializing gamification:', error);
            return null;
        }
    }

    // Buscar dados de gamificação
    static async getGamificationData(userId: string): Promise<UserGamification | null> {
        try {
            const { data, error } = await supabase
                .from('user_gamification')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Não existe ainda, criar
                    return await this.initializeGamification(userId);
                }
                console.error('Error fetching gamification:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Unexpected error fetching gamification:', error);
            return null;
        }
    }

    // Adicionar XP e verificar level-up
    static async awardXP(userId: string, amount: number, reason: string): Promise<{
        newLevel: number;
        leveledUp: boolean;
        newXP: number;
        totalXP: number;
    } | null> {
        try {
            const current = await this.getGamificationData(userId);
            if (!current) return null;

            const newTotalXP = current.total_xp + amount;
            const newLevel = this.calculateLevel(newTotalXP);
            const leveledUp = newLevel > current.level;
            const xpForCurrentLevel = this.getXPForLevel(newLevel);
            const newXP = newTotalXP - xpForCurrentLevel;

            const { data, error } = await supabase
                .from('user_gamification')
                .update({
                    xp: newXP,
                    total_xp: newTotalXP,
                    level: newLevel,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                console.error('Error awarding XP:', error);
                return null;
            }

            // Log da ação (opcional, para analytics)
            console.log(`[XP] User ${userId} earned ${amount} XP for ${reason}`);

            return {
                newLevel,
                leveledUp,
                newXP,
                totalXP: newTotalXP
            };
        } catch (error) {
            console.error('Unexpected error awarding XP:', error);
            return null;
        }
    }

    // Calcular nível baseado no XP total
    static calculateLevel(totalXP: number): number {
        for (let i = LEVEL_CURVE.length - 1; i >= 0; i--) {
            if (totalXP >= LEVEL_CURVE[i]) {
                return i + 1;
            }
        }
        return 1;
    }

    // XP necessário para um nível específico
    static getXPForLevel(level: number): number {
        if (level <= 1) return 0;
        if (level > LEVEL_CURVE.length) {
            // Progressão exponencial após o último nível definido
            const lastLevel = LEVEL_CURVE.length;
            const lastXP = LEVEL_CURVE[lastLevel - 1];
            const increment = 1000;
            return lastXP + (level - lastLevel) * increment;
        }
        return LEVEL_CURVE[level - 1];
    }

    // Atualizar streak
    static async updateStreak(userId: string): Promise<void> {
        try {
            const current = await this.getGamificationData(userId);
            if (!current) return;

            const today = new Date().toISOString().split('T')[0];
            const lastActivity = current.last_activity_date;

            let newStreak = current.streak_days;

            if (!lastActivity) {
                newStreak = 1;
            } else {
                const lastDate = new Date(lastActivity);
                const todayDate = new Date(today);
                const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) {
                    // Mesmo dia, não muda streak
                    return;
                } else if (diffDays === 1) {
                    // Dia consecutivo
                    newStreak = current.streak_days + 1;
                } else {
                    // Quebrou a sequência
                    newStreak = 1;
                }
            }

            const longestStreak = Math.max(current.longest_streak, newStreak);

            await supabase
                .from('user_gamification')
                .update({
                    streak_days: newStreak,
                    longest_streak: longestStreak,
                    last_activity_date: today,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            // Award streak bonus
            if (newStreak % 7 === 0) {
                await this.awardXP(userId, XP_REWARDS.WEEKLY_STREAK, `${newStreak} day streak`);
            }
        } catch (error) {
            console.error('Error updating streak:', error);
        }
    }

    // Verificar e desbloquear badges
    static async checkAndUnlockBadges(userId: string): Promise<UserAchievement[]> {
        try {
            const gamification = await this.getGamificationData(userId);
            if (!gamification) return [];

            // Buscar badges já desbloqueados
            const { data: existingBadges } = await supabase
                .from('user_achievements')
                .select('badge_id')
                .eq('user_id', userId);

            const unlockedBadgeIds = new Set(existingBadges?.map(b => b.badge_id) || []);
            const newBadges: UserAchievement[] = [];

            // Verificar cada badge
            for (const badgeDef of BADGE_DEFINITIONS) {
                if (unlockedBadgeIds.has(badgeDef.id)) continue;

                let shouldUnlock = false;

                switch (badgeDef.criteria.type) {
                    case 'streak':
                        shouldUnlock = gamification.streak_days >= badgeDef.criteria.target;
                        break;
                    case 'level':
                        shouldUnlock = gamification.level >= badgeDef.criteria.target;
                        break;
                    case 'count':
                        // Precisaria verificar contagem de meals/glucose
                        // Implementar depois quando integrar com as ações
                        break;
                    case 'tir':
                        // Precisaria calcular TIR
                        // Implementar depois
                        break;
                    case 'profile':
                        // Verificar % de completamento
                        // Implementar depois
                        break;
                }

                if (shouldUnlock) {
                    const { data: newBadge } = await supabase
                        .from('user_achievements')
                        .insert({
                            user_id: userId,
                            badge_id: badgeDef.id,
                            badge_name: badgeDef.name,
                            xp_earned: 100, // XP fixo por badge
                            unlocked_at: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (newBadge) {
                        newBadges.push(newBadge);
                        // Award XP for unlocking badge
                        await this.awardXP(userId, 100, `Unlocked badge: ${badgeDef.name}`);
                    }
                }
            }

            return newBadges;
        } catch (error) {
            console.error('Error checking badges:', error);
            return [];
        }
    }

    // Marcar tarefa de perfil como completa
    static async completeProfileTask(userId: string, taskKey: ProfileTaskKey): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('profile_completion_tasks')
                .upsert({
                    user_id: userId,
                    task_key: taskKey,
                    completed: true,
                    completed_at: new Date().toISOString(),
                    xp_awarded: XP_REWARDS.PROFILE_SECTION
                })
                .select()
                .single();

            if (error) {
                console.error('Error completing profile task:', error);
                return false;
            }

            // Award XP
            await this.awardXP(userId, XP_REWARDS.PROFILE_SECTION, `Completed profile section: ${taskKey}`);

            return true;
        } catch (error) {
            console.error('Unexpected error completing profile task:', error);
            return false;
        }
    }

    // Buscar tarefas de perfil
    static async getProfileTasks(userId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('profile_completion_tasks')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                console.error('Error fetching profile tasks:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Unexpected error fetching profile tasks:', error);
            return [];
        }
    }
}
