import React, { useState, useEffect } from 'react';
import { UserGamification } from '../types';
import { GamificationService } from '../services/gamificationService';
import { Sparkles, TrendingUp } from 'lucide-react';

interface NavbarXPProps {
    userId: string;
}

export const NavbarXP: React.FC<NavbarXPProps> = ({ userId }) => {
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
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1.5 rounded-xl border border-amber-200/50 shadow-sm">
            {/* Level Badge */}
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-black text-sm">{gamification.level}</span>
            </div>

            {/* XP Info */}
            <div className="flex flex-col min-w-[100px]">
                <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-700">Nível {gamification.level}</span>
                    <Sparkles size={10} className="text-amber-500" fill="currentColor" />
                </div>

                {/* Progress Bar */}
                <div className="relative mt-0.5">
                    <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                    </div>
                </div>

                {/* XP Text */}
                <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">
                        {xpInCurrentLevel}/{xpNeededForNextLevel} XP
                    </span>
                </div>
            </div>

            {/* Streak Badge (if active) */}
            {gamification.streak_days > 0 && (
                <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-lg border border-orange-200">
                    <span className="text-sm">🔥</span>
                    <span className="text-xs font-bold text-orange-700">{gamification.streak_days}</span>
                </div>
            )}
        </div>
    );
};
