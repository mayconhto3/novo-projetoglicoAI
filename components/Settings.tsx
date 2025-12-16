
import React, { useState, useEffect } from 'react';
import { UserProfile, NotificationSettings } from '../types';
import { 
    User, Syringe, Bell, Stethoscope, Gamepad2, 
    Link2, Lock, Info, ChevronRight, Edit2, 
    Smartphone, ArrowLeft, Shield, LogOut,
    Activity, Save, Loader2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface SettingsProps {
    user: UserProfile;
    onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onBack }) => {
    const [loading, setLoading] = useState(false);
    
    // Initialize settings from user profile or defaults
    const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
        user.notificationSettings || {
            breakfast: true,
            lunch: true,
            dinner: true,
            medication: false,
            glucoseCheck: true,
            whatsapp: true
        }
    );

    // Save changes to Supabase
    const saveSettings = async (newSettings: NotificationSettings) => {
        setNotifSettings(newSettings); // Optimistic update
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    medical_data: { 
                        ...user, 
                        notificationSettings: newSettings 
                    } 
                })
                .eq('id', (await supabase.auth.getUser()).data.user?.id);

            if (error) throw error;
        } catch (err) {
            console.error("Erro ao salvar configurações:", err);
            // Revert on error could be implemented here
        } finally {
            setLoading(false);
        }
    };

    const toggleSetting = (key: keyof NotificationSettings) => {
        const newSettings = { ...notifSettings, [key]: !notifSettings[key] };
        saveSettings(newSettings);
    };
    
    // Toggle Switch Component auxiliar
    const Toggle = ({ checked, label, onClick }: { checked: boolean, label: string, onClick: () => void }) => (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <span className="text-sm text-slate-600 font-medium">{label}</span>
            <div 
                onClick={onClick}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}
            >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-5' : ''}`}></div>
            </div>
        </div>
    );

    // List Item Component auxiliar
    const ListItem = ({ icon, label, value, subValue }: { icon?: any, label: string, value?: string, subValue?: string }) => (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-lg cursor-pointer group">
            <div className="flex items-center gap-3">
                {icon && <div className="text-slate-400 group-hover:text-teal-600 transition-colors">{icon}</div>}
                <div>
                    <p className="text-sm font-semibold text-slate-700">{label}</p>
                    {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm text-slate-500">{value}</span>}
                <ChevronRight size={16} className="text-slate-300" />
            </div>
        </div>
    );

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="pb-28 bg-[#F8FAFC] min-h-screen">
            {/* Header */}
            <div className="bg-white sticky top-0 z-20 shadow-sm p-4 rounded-b-[2rem]">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">Configurações</h1>
                    </div>
                    {loading && <Loader2 size={16} className="animate-spin text-teal-600" />}
                </div>
            </div>

            <div className="p-4 space-y-6">

                {/* 1. PERFIL */}
                <section>
                    <h2 className="section-title"><User size={16} /> Perfil</h2>
                    <div className="card-container">
                        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                            <div className="w-16 h-16 rounded-full bg-teal-100 border-2 border-teal-50 flex items-center justify-center text-2xl relative">
                                👤
                                <button className="absolute bottom-0 right-0 bg-teal-600 text-white p-1 rounded-full border-2 border-white">
                                    <Edit2 size={10} />
                                </button>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">{user.name}</h3>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                        </div>
                        <ListItem label="Dados Pessoais" value="Editar" />
                        <ListItem label="Informações de Saúde" value="Tipo 1, 78kg..." />
                    </div>
                </section>

                {/* 2. TRATAMENTO */}
                <section>
                    <h2 className="section-title"><Syringe size={16} /> Parâmetros de Tratamento</h2>
                    <div className="card-container">
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Ratios (Insulina:Carbo)</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Café</span>
                                    <span className="font-bold text-teal-700">1:{user.icRatioBreakfast || '--'}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Almoço</span>
                                    <span className="font-bold text-teal-700">1:{user.icRatioLunch || '--'}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                    <span className="text-[10px] text-slate-500 block">Jantar</span>
                                    <span className="font-bold text-teal-700">1:{user.icRatioDinner || '--'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <ListItem label="Fator de Sensibilidade" value={`1:${user.isfMorning || '--'}`} />
                        <ListItem label="Meta Glicêmica" value={`${user.targetGlucosePreMeal}-${user.targetGlucosePostMeal} mg/dL`} />
                        <ListItem label="Insulina Basal" value={`${user.basalInsulin?.brand || 'N/A'}`} />
                    </div>
                </section>

                {/* 3. LEMBRETES - FUNCIONAL */}
                <section>
                    <h2 className="section-title"><Bell size={16} /> Lembretes e Notificações</h2>
                    <div className="card-container">
                        <div className="mb-2">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Refeições (Push + Ações)</p>
                            <Toggle 
                                label={`Café (${user.mealTimes.breakfast})`} 
                                checked={notifSettings.breakfast} 
                                onClick={() => toggleSetting('breakfast')}
                            />
                            <Toggle 
                                label={`Almoço (${user.mealTimes.lunch})`} 
                                checked={notifSettings.lunch} 
                                onClick={() => toggleSetting('lunch')}
                            />
                            <Toggle 
                                label={`Jantar (${user.mealTimes.dinner})`} 
                                checked={notifSettings.dinner} 
                                onClick={() => toggleSetting('dinner')}
                            />
                        </div>
                        <div className="pt-2 border-t border-gray-100">
                            <Toggle 
                                label="Lembretes de Medicação" 
                                checked={notifSettings.medication} 
                                onClick={() => toggleSetting('medication')}
                            />
                            <Toggle 
                                label="Alertas de Glicemia" 
                                checked={notifSettings.glucoseCheck} 
                                onClick={() => toggleSetting('glucoseCheck')}
                            />
                            <Toggle 
                                label="Notificações WhatsApp" 
                                checked={notifSettings.whatsapp} 
                                onClick={() => toggleSetting('whatsapp')}
                            />
                        </div>
                         <div className="bg-blue-50 p-3 rounded-xl mt-3 flex gap-2 items-start">
                             <Info size={16} className="text-blue-500 mt-0.5" />
                             <p className="text-xs text-blue-600">
                                 Estes lembretes enviarão notificações inteligentes com botões de ação rápida ("Já comi", "Adiar").
                             </p>
                         </div>
                    </div>
                </section>

                {/* 4. EQUIPE MÉDICA */}
                <section>
                    <h2 className="section-title"><Stethoscope size={16} /> Equipe Médica</h2>
                    <div className="card-container">
                        <div className="flex items-center justify-between py-3 border-b border-gray-50">
                            <div>
                                <p className="font-bold text-slate-700 text-sm">Dr. Carlos Silva</p>
                                <p className="text-xs text-slate-400">Endocrinologista</p>
                            </div>
                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Relat. Auto</span>
                        </div>
                        <ListItem label="Nutricionista" value="Adicionar" />
                        <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Cuidadores</p>
                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs">👩</div>
                                    <div>
                                        <p className="font-bold text-slate-700 text-sm">Maria Silva (Mãe)</p>
                                        <p className="text-[10px] text-slate-400">Acesso Total</p>
                                    </div>
                                </div>
                                <Edit2 size={14} className="text-slate-300" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. GAMIFICAÇÃO */}
                <section>
                    <h2 className="section-title"><Gamepad2 size={16} /> Gamificação</h2>
                    <div className="card-container">
                        <Toggle label="Participar de Rankings" checked={true} onClick={() => {}} />
                        <Toggle label="Desafios Semanais" checked={true} onClick={() => {}} />
                        <Toggle label="Notif. Conquistas" checked={true} onClick={() => {}} />
                        <Toggle label="Modo Privado" checked={false} onClick={() => {}} />
                    </div>
                </section>

                {/* 6. INTEGRAÇÕES */}
                <section>
                    <h2 className="section-title"><Link2 size={16} /> Integrações</h2>
                    <div className="card-container space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-green-600"><Smartphone size={18} /></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">WhatsApp AI</p>
                                    <p className="text-[10px] text-green-600 font-bold">● Conectado</p>
                                </div>
                            </div>
                            <button className="text-xs text-slate-500 font-medium">Configurar</button>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-70">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg text-slate-400"><Activity size={18} /></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Sensor CGM</p>
                                    <p className="text-[10px] text-red-400 font-bold">● Desconectado</p>
                                </div>
                            </div>
                            <button className="text-xs text-teal-600 font-bold">Conectar</button>
                        </div>
                    </div>
                </section>

                 {/* 7. PRIVACIDADE E SOBRE */}
                 <section>
                    <h2 className="section-title"><Shield size={16} /> Privacidade e Segurança</h2>
                    <div className="card-container">
                        <ListItem icon={<Lock size={16} />} label="Alterar Senha" />
                        <Toggle label="Autenticação 2 Fatores" checked={true} onClick={() => {}} />
                        <ListItem icon={<Info size={16} />} label="Termos de Uso" />
                        <div className="pt-2 border-t border-gray-100 mt-2">
                            <button 
                                onClick={handleLogout}
                                className="w-full py-3 flex items-center justify-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut size={16} /> Sair da Conta
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-4">Versão 1.0.4 - Notifications Enabled</p>
                </section>

            </div>

            <style>{`
                .section-title {
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #94a3b8;
                    margin-bottom: 0.5rem;
                    margin-left: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .card-container {
                    background: white;
                    border-radius: 1.5rem;
                    padding: 1.25rem;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    border: 1px solid #f1f5f9;
                }
            `}</style>
        </div>
    );
};
