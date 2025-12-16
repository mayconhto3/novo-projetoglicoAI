import React from 'react';
import { CheckCircle2, Circle, Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { ProfileTaskKey, ProfileTaskMetadata } from '../types';

interface ProfileCompletionCardProps {
    completionPercentage: number;
    tasks: Array<{
        key: ProfileTaskKey;
        completed: boolean;
        metadata: ProfileTaskMetadata;
    }>;
    onTaskClick: (taskKey: ProfileTaskKey) => void;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = ({
    completionPercentage,
    tasks,
    onTaskClick
}) => {
    const incompleteTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const totalXPAvailable = incompleteTasks.reduce((sum, t) => sum + t.metadata.xp_reward, 0);

    return (
        <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl p-5 shadow-md border-2 border-amber-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Trophy className="text-white" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Complete seu Perfil</h3>
                        <p className="text-xs text-slate-600">
                            {completedTasks.length} de {tasks.length} concluídas
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Disponível</p>
                    <p className="text-xl font-black text-amber-600 flex items-center gap-1">
                        +{totalXPAvailable}
                        <Sparkles size={16} className="text-amber-500" fill="currentColor" />
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600">Progresso</span>
                    <span className="text-xs font-bold text-teal-600">{completionPercentage}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 transition-all duration-700 ease-out rounded-full shadow-lg"
                        style={{ width: `${completionPercentage}%` }}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {tasks.slice(0, 6).map(task => (
                    <button
                        key={task.key}
                        onClick={() => !task.completed && onTaskClick(task.key)}
                        disabled={task.completed}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition group ${task.completed
                                ? 'bg-green-50 border border-green-200 cursor-default'
                                : 'bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 hover:shadow-md cursor-pointer'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {task.completed ? (
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                    <CheckCircle2 className="text-white" size={16} />
                                </div>
                            ) : (
                                <div className="w-6 h-6 border-2 border-slate-300 rounded-full flex items-center justify-center group-hover:border-teal-500 transition">
                                    <Circle className="text-slate-300 group-hover:text-teal-500 transition" size={14} />
                                </div>
                            )}
                            <div className="text-left">
                                <p className={`text-sm font-semibold ${task.completed ? 'text-green-700 line-through' : 'text-slate-700'}`}>
                                    {task.metadata.icon} {task.metadata.title}
                                </p>
                                <p className="text-xs text-slate-500">{task.metadata.description}</p>
                            </div>
                        </div>
                        {!task.completed && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                                    +{task.metadata.xp_reward} XP
                                </span>
                                <ChevronRight className="text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition" size={18} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {incompleteTasks.length > 6 && (
                <p className="text-xs text-center text-slate-400 mt-3 font-medium">
                    +{incompleteTasks.length - 6} tarefas restantes
                </p>
            )}

            {completionPercentage === 100 && (
                <div className="mt-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center shadow-lg">
                    <p className="font-bold text-lg">🎉 Perfil Completo!</p>
                    <p className="text-sm opacity-90">Você desbloqueou o badge "Perfil Completo"</p>
                </div>
            )}
        </div>
    );
};
