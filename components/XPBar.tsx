import React, { useState, useEffect } from 'react';
import { UserGamification } from '../types';
import { GamificationService } from '../services/gamificationService';
import { Sparkles, TrendingUp } from 'lucide-react';

interface XPBarProps {
    userId: string;
}

export const XPBar: React.FC<XPBarProps> = ({ userId }) => {
    const [gamification, setGamification] = useState<UserGamification | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGamification();
    }, [userId]);

    const loadGamification = async () => {
        try {
            const data = await GamificationService.getGamificationData(userId);
            setGamification(data);
        } catch (error) {
            console.error('Error loading gamification:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !gamification) {
        return null;
    }

    const currentLevelXP = GamificationService.getXPForLevel(gamification.level);
    const nextLevelXP = GamificationService.getXPForLevel(gamification.level + 1);
    const xpInCurrentLevel = gamification.total_xp - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const progressPercentage = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

    return (
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-2xl p-4 border border-teal-100 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-black text-lg">{gamification.level}</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nível {gamification.level}</p>
                        <p className="text-sm font-semibold text-slate-700">
                            {xpInCurrentLevel} / {xpNeededForNextLevel} XP
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-1 text-teal-600">
                        <Sparkles size={16} fill="currentColor" />
                        <span className="text-lg font-black">{gamification.total_xp}</span>
                    </div>
                    <p className="text-xs text-slate-500">XP Total</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out shadow-lg"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-500 font-medium">
                        Faltam {xpNeededForNextLevel - xpInCurrentLevel} XP para o nível {gamification.level + 1}
                    </p>
                    <TrendingUp size={14} className="text-teal-600" />
                </div>
            </div>

            {/* Streak */}
            {gamification.streak_days > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                    <span className="text-lg">🔥</span>
                    <div>
                        <p className="text-xs font-bold text-orange-700">
                            {gamification.streak_days} {gamification.streak_days === 1 ? 'dia' : 'dias'} seguidos
                        </p>
                        <p className="text-xs text-orange-600">Recorde: {gamification.longest_streak} dias</p>
                    </div>
                </div>
            )}
        </div>
    );
};
