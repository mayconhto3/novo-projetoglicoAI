import { useState, useCallback } from 'react';
import { GamificationService, XP_REWARDS } from '../services/gamificationService';
import { UserGamification, UserAchievement } from '../types';

interface GamificationNotification {
    type: 'xp' | 'levelup' | 'badge';
    data: {
        amount?: number;
        reason?: string;
        newLevel?: number;
        badge?: {
            name: string;
            icon: string;
            description: string;
        };
    };
}

export const useGamification = (userId: string) => {
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [notification, setNotification] = useState<GamificationNotification | null>(null);
    const [loading, setLoading] = useState(false);

    // Carregar dados de gamificação
    const loadGamification = useCallback(async () => {
        try {
            const data = await GamificationService.getGamificationData(userId);
            setGamification(data);
            return data;
        } catch (error) {
            console.error('Error loading gamification:', error);
            return null;
        }
    }, [userId]);

    // Award XP e mostrar notificação
    const awardXP = useCallback(async (amount: number, reason: string) => {
        setLoading(true);
        try {
            const result = await GamificationService.awardXP(userId, amount, reason);

            if (result) {
                // Atualizar dados locais
                await loadGamification();

                // Mostrar notificação de XP
                setNotification({
                    type: 'xp',
                    data: { amount, reason }
                });

                // Se subiu de nível, mostrar notificação de level-up
                if (result.leveledUp) {
                    setTimeout(() => {
                        setNotification({
                            type: 'levelup',
                            data: { newLevel: result.newLevel }
                        });
                    }, 3500); // Após fechar notificação de XP
                }

                return result;
            }
        } catch (error) {
            console.error('Error awarding XP:', error);
        } finally {
            setLoading(false);
        }
        return null;
    }, [userId, loadGamification]);

    // Atualizar streak
    const updateStreak = useCallback(async () => {
        try {
            await GamificationService.updateStreak(userId);
            await loadGamification();
        } catch (error) {
            console.error('Error updating streak:', error);
        }
    }, [userId, loadGamification]);

    // Verificar e desbloquear badges
    const checkBadges = useCallback(async () => {
        try {
            const newBadges = await GamificationService.checkAndUnlockBadges(userId);

            if (newBadges.length > 0) {
                // Mostrar notificação para cada badge novo
                newBadges.forEach((badge, index) => {
                    setTimeout(() => {
                        setNotification({
                            type: 'badge',
                            data: {
                                badge: {
                                    name: badge.badge_name,
                                    icon: '🏆', // TODO: Mapear ícone correto
                                    description: `Você desbloqueou: ${badge.badge_name}`
                                }
                            }
                        });
                    }, index * 4000); // Espaçar badges
                });

                await loadGamification();
            }
        } catch (error) {
            console.error('Error checking badges:', error);
        }
    }, [userId, loadGamification]);

    // Fechar notificação
    const closeNotification = useCallback(() => {
        setNotification(null);
    }, []);

    // Ações rápidas com XP
    const onGlucoseEntry = useCallback(async () => {
        await awardXP(XP_REWARDS.GLUCOSE_ENTRY, 'Registro de glicemia');
        await updateStreak();
        await checkBadges();
    }, [awardXP, updateStreak, checkBadges]);

    const onMealEntry = useCallback(async () => {
        await awardXP(XP_REWARDS.MEAL_ENTRY, 'Registro de refeição');
        await updateStreak();
        await checkBadges();
    }, [awardXP, updateStreak, checkBadges]);

    const onInsulinEntry = useCallback(async () => {
        await awardXP(XP_REWARDS.INSULIN_ENTRY, 'Aplicação de insulina');
        await updateStreak();
        await checkBadges();
    }, [awardXP, updateStreak, checkBadges]);

    const onProfileTaskComplete = useCallback(async (taskName: string) => {
        await awardXP(XP_REWARDS.PROFILE_SECTION, `Completou: ${taskName}`);
        await checkBadges();
    }, [awardXP, checkBadges]);

    return {
        gamification,
        notification,
        loading,
        loadGamification,
        awardXP,
        updateStreak,
        checkBadges,
        closeNotification,
        // Ações rápidas
        onGlucoseEntry,
        onMealEntry,
        onInsulinEntry,
        onProfileTaskComplete
    };
};
