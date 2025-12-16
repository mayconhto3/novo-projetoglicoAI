import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Trophy, X } from 'lucide-react';

interface XPNotificationProps {
    amount: number;
    reason: string;
    onClose: () => void;
}

export const XPNotification: React.FC<XPNotificationProps> = ({ amount, reason, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Sparkles size={20} fill="currentColor" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-lg">+{amount} XP</p>
                    <p className="text-xs text-white/90">{reason}</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-6 h-6 hover:bg-white/20 rounded-full flex items-center justify-center transition"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

interface LevelUpNotificationProps {
    newLevel: number;
    onClose: () => void;
}

export const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({ newLevel, onClose }) => {
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowConfetti(false);
            setTimeout(onClose, 500);
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <>
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: '-10%',
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                    backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)]
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Level Up Modal */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-1 rounded-3xl shadow-2xl animate-in zoom-in duration-500">
                    <div className="bg-white rounded-3xl p-8 text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
                            <Trophy className="text-white" size={48} />
                        </div>

                        <h2 className="text-3xl font-black text-slate-800 mb-2">
                            Parabéns! 🎉
                        </h2>

                        <p className="text-slate-600 mb-4">Você subiu de nível!</p>

                        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 mb-6">
                            <p className="text-sm font-bold text-amber-700 mb-2">Novo Nível</p>
                            <p className="text-6xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                {newLevel}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:from-teal-700 hover:to-blue-700 transition shadow-lg flex items-center gap-2 mx-auto"
                        >
                            <TrendingUp size={20} />
                            Continuar
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
        </>
    );
};

interface BadgeUnlockedNotificationProps {
    badgeName: string;
    badgeIcon: string;
    badgeDescription: string;
    onClose: () => void;
}

export const BadgeUnlockedNotification: React.FC<BadgeUnlockedNotificationProps> = ({
    badgeName,
    badgeIcon,
    badgeDescription,
    onClose
}) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4 shadow-2xl animate-in zoom-in duration-500">
                <div className="text-6xl mb-4 animate-bounce">{badgeIcon}</div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    Badge Desbloqueado!
                </h3>

                <p className="text-lg font-semibold text-teal-600 mb-2">{badgeName}</p>
                <p className="text-sm text-slate-500 mb-6">{badgeDescription}</p>

                <button
                    onClick={onClose}
                    className="bg-gradient-to-r from-teal-600 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:from-teal-700 hover:to-blue-700 transition shadow-lg"
                >
                    Incrível! ✨
                </button>
            </div>
        </div>
    );
};
