import React, { useState } from 'react';
import { UserProfile, InsulinRecord } from '../types';
import { supabase } from '../services/supabaseClient';
import { Check, Clock, Droplet, Plus } from 'lucide-react';

interface BasalCheckInCardProps {
    user: UserProfile;
    todaysLogs: InsulinRecord[];
    onCheckIn: () => void;
}

export const BasalCheckInCard: React.FC<BasalCheckInCardProps> = ({ user, todaysLogs, onCheckIn }) => {
    const [loading, setLoading] = useState<string | null>(null);

    // Se não usa insulina ou não tem basal configurada, não mostra nada
    if (!user.usesInsulin || !user.basalInsulin?.brand) return null;

    const { brand, morningDose, nightDose, morningTime, nightTime } = user.basalInsulin;

    // Identificar o que já foi tomado hoje
    // A lógica assume que se houver um log de "Basal" perto do horário, foi tomado.
    // Simplificação: Se houver 1 log de basal e só tem 1 dose agendada -> OK.
    // Se tiver 2 doses agendadas, precisamos saber qual foi.
    // Vamos usar uma heurística de horário:
    // Manhã: 04:00 - 15:59
    // Noite: 16:00 - 03:59

    const morningLog = todaysLogs.find(l => {
        const hour = new Date(l.created_at).getHours();
        return l.insulin_type === 'Basal' && hour >= 4 && hour < 16;
    });

    const nightLog = todaysLogs.find(l => {
        const hour = new Date(l.created_at).getHours();
        return l.insulin_type === 'Basal' && (hour >= 16 || hour < 4);
    });

    const handleCheckIn = async (period: 'morning' | 'night', dose: number) => {
        setLoading(period);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error('Usuário não autenticado');

            const now = new Date();
            const { error } = await supabase.from('insulin_history').insert({
                user_id: currentUser.id,
                units: dose,
                insulin_type: 'Basal',
                brand: brand, // Marca da insulina (ex: Basaglar, Lantus)
                context: period === 'morning' ? 'Basal Manhã' : 'Basal Noite',
                taken_at: now.toISOString(),
                created_at: now.toISOString(),
                note: `Check-in rápido via Dashboard`
            });

            if (error) throw error;

            // Callback para atualizar o Dashboard
            onCheckIn();
        } catch (err) {
            console.error("Erro ao registrar basal:", err);
            alert("Erro ao registrar. Tente novamente.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 shadow-lg text-white mb-4 relative overflow-hidden">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full -ml-5 -mb-5"></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Droplet size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">Insulina Basal</h3>
                        <p className="text-xs text-indigo-100 opacity-80">{brand}</p>
                    </div>
                </div>
                {/* Se tudo estiver ok, mostrar check geral */}
                {((morningDose && morningLog) || !morningDose) && ((nightDose && nightLog) || !nightDose) && (
                    <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Check size={12} /> Dia Completo
                    </div>
                )}
            </div>

            <div className="space-y-3 relative z-10">
                {/* DOSE MANHÃ */}
                {morningDose && (
                    <div className="bg-white/10 rounded-2xl p-3 flex items-center justify-between border border-white/5">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-indigo-200" />
                            <div>
                                <p className="text-xs text-indigo-200 font-medium">Manhã {morningTime && `(${morningTime})`}</p>
                                <p className="font-bold text-lg">{morningDose}u</p>
                            </div>
                        </div>

                        {morningLog ? (
                            <div className="flex flex-col items-end">
                                <span className="flex items-center gap-1 text-emerald-300 font-bold text-sm bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                    <Check size={14} /> Tomado
                                </span>
                                <span className="text-[10px] text-indigo-200 mt-1">
                                    {new Date(morningLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleCheckIn('morning', morningDose)}
                                disabled={!!loading}
                                className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {loading === 'morning' ? '...' : <><Plus size={16} /> Check-in</>}
                            </button>
                        )}
                    </div>
                )}

                {/* DOSE NOITE */}
                {nightDose && (
                    <div className="bg-white/10 rounded-2xl p-3 flex items-center justify-between border border-white/5">
                        <div className="flex items-center gap-3">
                            <Clock size={16} className="text-purple-200" />
                            <div>
                                <p className="text-xs text-purple-200 font-medium">Noite {nightTime && `(${nightTime})`}</p>
                                <p className="font-bold text-lg">{nightDose}u</p>
                            </div>
                        </div>

                        {nightLog ? (
                            <div className="flex flex-col items-end">
                                <span className="flex items-center gap-1 text-emerald-300 font-bold text-sm bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                                    <Check size={14} /> Tomado
                                </span>
                                <span className="text-[10px] text-purple-200 mt-1">
                                    {new Date(nightLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleCheckIn('night', nightDose)}
                                disabled={!!loading}
                                className="bg-white text-purple-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-purple-50 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {loading === 'night' ? '...' : <><Plus size={16} /> Check-in</>}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
