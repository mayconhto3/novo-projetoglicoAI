
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile, GlucoseReading, Reminder, Meal, InsulinRecord, ProfileTaskKey } from '../types';
import GlucoseChart from './GlucoseChart';
import { generateHealthInsight } from '../services/geminiService';
import { ChatAssistant } from './ChatAssistant';
import { MedicalReportModal } from './MedicalReportModal';
import { ReminderManager } from './ReminderManager';
import { MealHistory } from './MealHistory';
import { InsulinHistory } from './InsulinHistory';
import { GlucoseHistory } from './GlucoseHistory';
import { GlucoseEntryModal } from './GlucoseEntryModal';
import { Gamification } from './Gamification';
import { Settings } from './Settings';
import { NavbarXP } from './NavbarXP';
import { ProfileCompletionCard } from './ProfileCompletionCard';
import { PROFILE_TASK_METADATA, calculateCompletionPercentage, isTaskComplete } from '../services/profileTasksConfig';
import { XPNotification, LevelUpNotification, BadgeUnlockedNotification } from './GamificationNotifications';
import { useGamification } from '../hooks/useGamification';
import { BasalCheckInCard } from './BasalCheckInCard';
import {
    Activity,
    Bot,
    TrendingUp,
    Plus,
    FileText,
    Bell,
    Zap,
    AlertTriangle,
    CheckCircle2,
    AlertCircle,
    Trophy,
    LogOut,
    Utensils,
    Camera,
    Clock,
    Sun,
    Moon,
    Sunset,
    RefreshCw
} from 'lucide-react';

interface DashboardProps {
    user: UserProfile;
    session: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, session }) => {
    const [readings, setReadings] = useState<GlucoseReading[]>([]);
    const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
    const [recentInsulin, setRecentInsulin] = useState<InsulinRecord[]>([]);
    const [activeInsulin, setActiveInsulin] = useState<number>(0);

    const [aiInsight, setAiInsight] = useState<string>('Toque para gerar análise inteligente');
    const [loadingAi, setLoadingAi] = useState(false);
    const [insightGenerated, setInsightGenerated] = useState(false);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isRemindersOpen, setIsRemindersOpen] = useState(false);
    const [isGlucoseEntryOpen, setIsGlucoseEntryOpen] = useState(false);
    const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);

    const [activeScreen, setActiveScreen] = useState<'dashboard' | 'meals' | 'insulin' | 'glucose' | 'gamification' | 'settings'>('dashboard');
    const [profileTaskModalOpen, setProfileTaskModalOpen] = useState(false);
    const [selectedTaskKey, setSelectedTaskKey] = useState<ProfileTaskKey | null>(null);

    const notifiedMap = useRef<Map<string, number>>(new Map());

    // Gamification hook
    const {
        notification,
        closeNotification,
        onGlucoseEntry,
        onMealEntry,
        onInsulinEntry,
        loadGamification
    } = useGamification(session.user.id);

    // Carregar gamificação ao montar
    useEffect(() => {
        loadGamification();
    }, [loadGamification]);

    const fetchActiveInsulin = async () => {
        try {
            const { data, error } = await supabase.rpc('calculate_active_insulin', {
                p_user_id: session.user.id,
                p_dia: user.insulinDuration || 4
            });

            if (error) throw error;
            setActiveInsulin(data || 0);
        } catch (err) {
            console.error("Error calculating IOB:", err);
            setActiveInsulin(0);
        }
    };

    const fetchChartData = async () => {
        try {
            const rangeDate = new Date();
            rangeDate.setDate(rangeDate.getDate() - 3);

            const { data: glucoseData, error: glucoseError } = await supabase
                .from('glucose_readings')
                .select('*')
                .gte('timestamp', rangeDate.toISOString())
                .order('timestamp', { ascending: true });

            if (glucoseError) throw glucoseError;

            const formattedReadings: GlucoseReading[] = (glucoseData || []).map(r => ({
                id: r.id,
                value: Number(r.value),
                timestamp: new Date(r.timestamp),
                type: r.type as any
            }));
            setReadings(formattedReadings);

            const { data: mealData } = await supabase
                .from('meal_history')
                .select('*')
                .gte('created_at', rangeDate.toISOString());

            if (mealData) setRecentMeals(mealData as Meal[]);

            const { data: insulinData } = await supabase
                .from('insulin_history')
                .select('*')
                .gte('created_at', rangeDate.toISOString());

            if (insulinData) {
                const formattedInsulin = insulinData.map((i: any) => ({
                    ...i,
                    units: Number(i.units)
                }));
                setRecentInsulin(formattedInsulin as InsulinRecord[]);
            }

            // Fetch active insulin after loading insulin data
            await fetchActiveInsulin();

            return formattedReadings;

        } catch (err) {
            console.error("Error loading dashboard data:", err);
            return [];
        }
    };

    const fetchReminders = async () => {
        try {
            const { data } = await supabase
                .from('reminders')
                .select('*')
                .eq('active', true);

            if (data) setActiveReminders(data);
        } catch (err) {
            console.error("Error fetching reminders", err);
        }
    };

    useEffect(() => {
        const initData = async () => {
            await fetchChartData();
            await fetchReminders();
        };

        initData();
    }, [user]);

    // --- MANUAL INSIGHT GENERATION ---
    const handleGenerateInsight = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening chat
        if (loadingAi || insightGenerated) return;

        setLoadingAi(true);
        try {
            const insight = await generateHealthInsight(user, readings);
            setAiInsight(insight);
            setInsightGenerated(true);
        } catch (err) {
            setAiInsight("Não foi possível gerar análise agora.");
        } finally {
            setLoadingAi(false);
        }
    };

    useEffect(() => {
        if (!session?.user?.id) return;

        const refreshData = async () => {
            const currentReadings = await fetchChartData();
        };

        const refreshInsulin = async () => {
            await fetchActiveInsulin();
        };

        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings', filter: `user_id=eq.${session.user.id}` }, refreshData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'insulin_history', filter: `user_id=eq.${session.user.id}` }, refreshInsulin)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, user]);

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const currentHours = now.getHours().toString().padStart(2, '0');
            const currentMinutes = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHours}:${currentMinutes}`;

            activeReminders.forEach(reminder => {
                if (reminder.time === currentTime) {
                    const lastNotified = notifiedMap.current.get(reminder.id) || 0;
                    const nowTs = Date.now();

                    if (nowTs - lastNotified > 60000) {
                        showNotification(reminder.title, `Hora de: ${reminder.type}`);
                        notifiedMap.current.set(reminder.id, nowTs);
                    }
                }
            });
        };

        const interval = setInterval(checkReminders, 10000);
        return () => clearInterval(interval);
    }, [activeReminders]);

    const mealImpacts = useMemo(() => {
        return recentMeals
            .filter(m => m.image_url)
            .map(meal => {
                const mealTime = new Date(meal.created_at).getTime();
                const minTime = mealTime + (90 * 60 * 1000);
                const maxTime = mealTime + (180 * 60 * 1000);

                const postPrandialReading = readings.find(r => {
                    const rTime = new Date(r.timestamp).getTime();
                    return rTime >= minTime && rTime <= maxTime;
                });

                return {
                    meal,
                    reading: postPrandialReading
                };
            })
            .filter(item => item.reading)
            .sort((a, b) => new Date(b.meal.created_at).getTime() - new Date(a.meal.created_at).getTime())
            .slice(0, 10);
    }, [recentMeals, readings]);

    const riskPatterns = useMemo(() => {
        if (readings.length < 5) return null;

        const blocks = [
            { id: 'dawn', label: 'Madrugada', icon: <Moon size={14} />, start: 0, end: 6 },
            { id: 'morning', label: 'Manhã', icon: <Sun size={14} />, start: 6, end: 12 },
            { id: 'afternoon', label: 'Tarde', icon: <Sun size={14} />, start: 12, end: 18 },
            { id: 'night', label: 'Noite', icon: <Sunset size={14} />, start: 18, end: 24 },
        ];

        const low = user.targetGlucosePreMeal || 70;
        const high = user.targetGlucosePostMeal || 180;

        const results = blocks.map(block => {
            const blockReadings = readings.filter(r => {
                const h = new Date(r.timestamp).getHours();
                return h >= block.start && h < block.end;
            });

            if (blockReadings.length === 0) return { ...block, risk: 0 };

            const outOfRange = blockReadings.filter(r => r.value < low || r.value > high).length;
            const riskPercentage = Math.round((outOfRange / blockReadings.length) * 100);

            return { ...block, risk: riskPercentage };
        });

        const worst = results.reduce((prev, current) => (prev.risk > current.risk) ? prev : current);

        return { blocks: results, worst };
    }, [readings, user]);


    const showNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body, icon: '/favicon.ico' });
                }
            });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const currentGlucose = readings.length > 0 ? readings[readings.length - 1].value : 0;

    const getGlucoseStatus = (val: number) => {
        if (val < 70) {
            return {
                label: 'HIPOGLICEMIA',
                textColor: 'text-red-500',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-100',
                dotColor: 'bg-red-500',
                icon: <AlertCircle size={14} />,
                borderClass: 'border-red-500'
            };
        }
        if (val > 250) {
            return {
                label: 'MUITO ALTA',
                textColor: 'text-red-500',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-100',
                dotColor: 'bg-red-500',
                icon: <AlertTriangle size={14} />,
                borderClass: 'border-red-500'
            };
        }
        if (val > 180) {
            return {
                label: 'ALTA',
                textColor: 'text-orange-500',
                bgColor: 'bg-orange-50',
                borderColor: 'border-orange-100',
                dotColor: 'bg-orange-500',
                icon: <TrendingUp size={14} />,
                borderClass: 'border-orange-500'
            };
        }
        return {
            label: 'NORMAL',
            textColor: 'text-emerald-500',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-100',
            dotColor: 'bg-emerald-500',
            icon: <CheckCircle2 size={14} />,
            borderClass: 'border-emerald-500'
        };
    };

    const status = getGlucoseStatus(currentGlucose);

    const calculateTIR = () => {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        const dailyReadings = readings.filter(r => r.timestamp >= oneDayAgo);

        if (dailyReadings.length === 0) return 0;
        const inRange = dailyReadings.filter(r => r.value >= user.targetGlucosePreMeal && r.value <= user.targetGlucosePostMeal).length;
        return Math.round((inRange / dailyReadings.length) * 100);
    };
    const timeInRange = calculateTIR();

    // Active insulin is now calculated via RPC and stored in state

    // RENDERIZAÇÃO DAS TELAS (Meals, Insulin, etc - sem alterações)
    if (activeScreen === 'meals') return <div className="min-h-screen bg-[#F8FAFC] flex justify-center"><div className="w-full max-w-lg bg-white min-h-screen shadow-2xl"><MealHistory onBack={() => setActiveScreen('dashboard')} /></div></div>;
    if (activeScreen === 'insulin') return <div className="min-h-screen bg-[#F8FAFC] flex justify-center"><div className="w-full max-w-lg bg-white min-h-screen shadow-2xl"><InsulinHistory onBack={() => setActiveScreen('dashboard')} /></div></div>;
    if (activeScreen === 'glucose') return <div className="min-h-screen bg-[#F8FAFC] flex justify-center"><div className="w-full max-w-lg bg-white min-h-screen shadow-2xl"><GlucoseHistory userProfile={user} onBack={() => setActiveScreen('dashboard')} /></div></div>;
    if (activeScreen === 'gamification') return <div className="min-h-screen bg-[#F8FAFC] flex justify-center"><div className="w-full max-w-lg bg-white min-h-screen shadow-2xl"><Gamification onBack={() => setActiveScreen('dashboard')} /></div></div>;
    if (activeScreen === 'settings') return <div className="min-h-screen bg-[#F8FAFC] flex justify-center"><div className="w-full max-w-lg bg-white min-h-screen shadow-2xl"><Settings user={user} onBack={() => setActiveScreen('dashboard')} /></div></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-28 relative overflow-x-hidden font-sans">

            {/* DASHBOARD PRINCIPAL */}
            <>
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100/50">
                    <div className="max-w-lg mx-auto px-6 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            {/* NavbarXP - Nível e XP */}
                            <NavbarXP userId={session.user.id} />

                            <div className="w-10 h-10 object-contain">
                                <img src="https://i.ibb.co/sBWYLd6/Kit-M-dico-Verde-Claro-M-dico-Logotipo-1000-x-1000-px-6.png" alt="Logo Icon" className="w-full h-full" />
                            </div>
                            <div className="h-8">
                                <img src="https://i.ibb.co/5XGDxTY6/Kit-M-dico-Verde-Claro-M-dico-Logotipo-1000-x-1000-px-1-1.png" alt="GlucoAI Text" className="h-full object-contain -ml-2" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setActiveScreen('gamification')} className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors flex items-center justify-center shadow-sm">
                                <Trophy size={20} />
                            </button>
                            <button onClick={() => setIsRemindersOpen(true)} className="w-10 h-10 rounded-2xl bg-[#E0F2F1] text-[#18A6A4] hover:bg-[#B2DFDB] transition-colors flex items-center justify-center shadow-sm">
                                <Bell size={20} />
                            </button>
                            <button onClick={handleLogout} className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors flex items-center justify-center shadow-sm">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-lg mx-auto px-6 py-6 space-y-3">

                    {/* 0. Basal Check-in - NOVO (Topo se usar insulina) */}
                    <BasalCheckInCard
                        user={user}
                        todaysLogs={recentInsulin.filter(i => {
                            const today = new Date();
                            const logDate = new Date(i.created_at);
                            return logDate.getDate() === today.getDate() &&
                                logDate.getMonth() === today.getMonth() &&
                                logDate.getFullYear() === today.getFullYear();
                        })}
                        onCheckIn={async () => {
                            await fetchChartData();
                            await onInsulinEntry(); // Award XP
                        }}
                    />

                    {/* 1. Glucose Card - PRIMEIRO */}
                    <div
                        onClick={() => setActiveScreen('glucose')}
                        className="bg-[#1abc9c] rounded-3xl p-6 shadow-lg shadow-[#0d4a4b]/10 border border-white/10 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-bl-[5rem] -mr-10 -mt-10 transition-transform group-hover:scale-105 duration-700"></div>
                        <div className="flex justify-between items-start mb-2 relative z-10">
                            <div>
                                <h2 className="text-sm font-semibold text-[#b3ffd2] uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#56da98] animate-pulse"></span>
                                    Glicemia Agora
                                </h2>
                                <div className="flex items-baseline mt-2">
                                    <span className="text-6xl font-bold text-white tracking-tighter">{currentGlucose}</span>
                                    <span className="text-base font-medium text-white/60 ml-1 mb-1">mg/dL</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 shadow-sm ${status.textColor === 'text-red-500' ? 'bg-[#ff6b6b] text-white animate-pulse' : status.textColor === 'text-orange-500' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5"></span>
                                    {status.label}
                                </span>
                                <span className="text-xs font-medium text-white/50 mt-2 bg-white/10 px-2 py-0.5 rounded-md">
                                    {readings.length > 0 ? readings[readings.length - 1].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                </span>
                            </div>
                        </div>
                        <div className="relative h-3 bg-black/20 rounded-full mt-6 overflow-visible border border-white/10">
                            {/* Background gradient showing zones */}
                            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-red-400 via-emerald-400 to-red-500 rounded-full opacity-30"></div>

                            {/* Dynamic colored bar based on glucose value */}
                            <div
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${currentGlucose < 70 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                    currentGlucose > 250 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                                        currentGlucose > 180 ? 'bg-gradient-to-r from-emerald-400 to-orange-400' :
                                            'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                    }`}
                                style={{ width: `${Math.min((currentGlucose / 350) * 100, 100)}%` }}
                            ></div>

                            {/* Precise position indicator at the end of the bar */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                                style={{ left: `${Math.min((currentGlucose / 350) * 100, 100)}%` }}
                            >
                                <div className={`w-4 h-4 rounded-full -ml-2 border-2 border-white shadow-lg ${currentGlucose < 70 ? 'bg-red-500 animate-pulse' :
                                    currentGlucose > 250 ? 'bg-red-500 animate-pulse' :
                                        currentGlucose > 180 ? 'bg-orange-500' :
                                            'bg-emerald-500'
                                    }`}></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-white/40 mt-2 px-1 font-semibold uppercase tracking-wide">
                            <span>0</span>
                            <span>70-180</span>
                            <span>350+</span>
                        </div>
                    </div>

                    {/* 2. AI Insight Manual Button - SEGUNDO (Dicas do GlicoAI) */}
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="w-full bg-[#b3ffd2] text-[#0d4a4b] rounded-2xl p-1 shadow-lg shadow-[#0d4a4b]/5 group active:scale-[0.99] transition-all overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center justify-between p-3.5 pl-4 bg-transparent z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-[#0d4a4b]/10 border border-[#0d4a4b]/5 flex items-center justify-center backdrop-blur-sm">
                                    <Bot size={24} className="text-[#0d4a4b]" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-[#0d4a4b]">Dica do GlicoAI</h3>
                                    <p className="text-xs text-[#0d4a4b]/70 font-light mt-0.5">
                                        {loadingAi ? "Analisando seus dados..." : insightGenerated ? "Análise gerada!" : "Analisando seus dados..."}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-[#56da98] text-[#0d4a4b] text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm border border-[#0d4a4b]/5 group-hover:bg-white group-hover:text-primary transition-all">
                                Gerar análise
                            </div>
                        </div>
                    </button>

                    {/* 3. Chart - TERCEIRO (Gráfico) */}
                    <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-gray-100/80">
                        <GlucoseChart
                            data={readings.filter(r => new Date(r.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000)}
                            targetLow={user.targetGlucosePreMeal}
                            targetHigh={user.targetGlucosePostMeal}
                            meals={recentMeals}
                            insulin={recentInsulin}
                        />
                    </div>

                    {/* 4. Profile Completion Card - REMOVIDO (XP já está no header) */}
                    {/* Card removido para não distrair usuários durante alertas ou glicemia baixa */}
                    {/* A barra de XP e nível já está visível no topo (NavbarXP) */}
                    {/*
                    {(() => {
                        const completionPercentage = calculateCompletionPercentage(user);
                        const tasks = Object.keys(PROFILE_TASK_METADATA).map(key => ({
                            key: key as ProfileTaskKey,
                            completed: isTaskComplete(key as ProfileTaskKey, user),
                            metadata: PROFILE_TASK_METADATA[key as ProfileTaskKey]
                        })).sort((a, b) => a.metadata.priority - b.metadata.priority);

                        // Só mostrar se não estiver 100% completo
                        if (completionPercentage < 100) {
                            return (
                                <ProfileCompletionCard
                                    completionPercentage={completionPercentage}
                                    tasks={tasks}
                                    onTaskClick={(taskKey) => {
                                        // TODO: Abrir modal de edição de perfil
                                        alert(`Editar: ${PROFILE_TASK_METADATA[taskKey].title}\n\nEm breve você poderá completar esta seção!`);
                                    }}
                                />
                            );
                        }
                        return null;
                    })()}
                    */}

                    {/* Risk Clock */}
                    {riskPatterns && riskPatterns.worst.risk > 15 && (
                        <div className="bg-white rounded-3xl p-5 shadow-soft border border-[#0d4a4b]/5 col-span-2 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#56da98]/5 rounded-full blur-2xl"></div>
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <h3 className="font-semibold text-[#0d4a4b] text-sm">Relógio de Risco</h3>
                                <Clock size={14} className="text-[#0d4a4b]/30" />
                            </div>
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="relative w-16 h-16 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            className="text-[#0d4a4b]/10"
                                            cx="32"
                                            cy="32"
                                            fill="transparent"
                                            r="28"
                                            stroke="currentColor"
                                            strokeWidth="6"
                                        />
                                        <circle
                                            className={riskPatterns.worst.risk > 30 ? 'text-[#ff6b6b]' : 'text-orange-500'}
                                            cx="32"
                                            cy="32"
                                            fill="transparent"
                                            r="28"
                                            stroke="currentColor"
                                            strokeDasharray="175.9"
                                            strokeDashoffset={175.9 - (175.9 * riskPatterns.worst.risk) / 100}
                                            strokeLinecap="round"
                                            strokeWidth="6"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-xs font-bold text-[#0d4a4b]">{riskPatterns.worst.risk}%</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-sm inline-block px-2 py-0.5 rounded-md border ${riskPatterns.worst.risk > 30 ? 'text-[#ff6b6b] bg-[#ff6b6b]/10 border-[#ff6b6b]/10' : 'text-orange-500 bg-orange-500/10 border-orange-500/10'}`}>
                                        Instável
                                    </p>
                                    <p className="text-xs text-[#0d4a4b]/60 leading-tight mt-2">
                                        Maior variação na <span className="font-bold text-[#0d4a4b]">{riskPatterns.worst.label}</span>
                                    </p>
                                    <div className="flex gap-1 mt-3 w-full">
                                        {riskPatterns.blocks.map((block, idx) => (
                                            <div
                                                key={block.id}
                                                className={`h-1.5 flex-1 rounded-full ${block.risk > 30 ? 'bg-[#ff6b6b]' :
                                                    block.risk > 15 ? 'bg-orange-500/40' :
                                                        'bg-[#0d4a4b]/20'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[8px] text-[#0d4a4b]/40 mt-1 font-bold uppercase tracking-wider w-full px-1">
                                        <span>Mad</span>
                                        <span>Man</span>
                                        <span>Tar</span>
                                        <span>Noi</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. Stats Grid - QUINTO (Tempo no Alvo + Insulina Ativa) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center group hover:border-[#18A6A4]/30 transition-colors">
                            <img src="https://i.ibb.co/5gcmTJDY/Design-sem-nome-2.png" alt="Alvo 3D" className="w-14 h-14 object-contain mb-2 group-hover:scale-110 transition-transform drop-shadow-sm" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tempo no Alvo</span>
                            <p className="text-2xl font-black text-gray-800 mt-1">{timeInRange}%</p>
                        </div>
                        <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center group hover:border-[#18A6A4]/30 transition-colors">
                            <img src="https://i.ibb.co/9m5kCr38/insulina-ativa.png" alt="Gota 3D" className="w-14 h-14 object-contain mb-2 group-hover:scale-110 transition-transform drop-shadow-sm" />
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Insulina Ativa</span>
                            <p className="text-2xl font-black text-gray-800 mt-1">{activeInsulin} <span className="text-sm font-medium text-gray-400">un</span></p>
                        </div>
                    </div>

                    {/* Impact Gallery */}
                    {mealImpacts.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pl-2">
                                <Camera size={16} className="text-slate-400" />
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impacto das Refeições Recentes</h3>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar px-1">
                                {mealImpacts.map((item, idx) => {
                                    const status = getGlucoseStatus(item.reading!.value);
                                    return (
                                        <div key={idx} className="snap-center flex-shrink-0 w-36 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group">
                                            <div className="h-28 w-full bg-slate-200">
                                                <img src={item.meal.image_url} alt="Refeição" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            </div>
                                            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                                                {item.meal.meal_time || 'Refeição'}
                                            </div>
                                            <div className="p-3 bg-white relative">
                                                <div className={`absolute -top-4 left-3 right-3 bg-white p-1 rounded-xl shadow-md border-2 ${status.borderClass} flex items-center justify-center gap-1`}>
                                                    {status.icon}
                                                    <span className={`font-black text-sm ${status.textColor}`}>
                                                        {item.reading!.value}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                                                    2h depois
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-4 pb-20">
                        <button onClick={() => setIsGlucoseEntryOpen(true)} className="bg-gradient-to-br from-[#18A6A4] to-[#26A69A] p-4 rounded-[2rem] shadow-lg shadow-[#18A6A4]/20 border border-[#18A6A4]/30 flex items-center gap-4 hover:scale-[1.02] transition-all active:scale-95 group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/10">
                                <Plus size={24} />
                            </div>
                            <div className="text-left relative z-10">
                                <span className="block font-bold text-white text-sm">Registrar</span>
                                <span className="text-xs text-teal-100">Leitura</span>
                            </div>
                        </button>
                        <button onClick={() => setIsReportOpen(true)} className="bg-gradient-to-br from-[#18A6A4] to-[#26A69A] p-4 rounded-[2rem] shadow-lg shadow-[#18A6A4]/20 border border-[#18A6A4]/30 flex items-center gap-4 hover:scale-[1.02] transition-all active:scale-95 group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm border border-white/10">
                                <FileText size={24} />
                            </div>
                            <div className="text-left relative z-10">
                                <span className="block font-bold text-white text-sm">Relatório</span>
                                <span className="text-xs text-teal-100">Médico</span>
                            </div>
                        </button>
                    </div>
                </main>
            </>


            {/* Bottom Navigation Bar - Mobile Style */}
            <div className={`fixed bottom-0 left-0 right-0 w-full bg-[#CCFBF1] border-t-2 border-[#029491]/20 z-40 ${activeScreen !== 'dashboard' ? 'hidden' : ''}`}>
                <div className="max-w-lg mx-auto flex items-center justify-around px-4 py-3">
                    <button
                        onClick={() => setActiveScreen('glucose')}
                        className="group flex flex-col items-center justify-center gap-1 transition-all active:scale-95 flex-1"
                    >
                        <div className="w-14 h-14 flex items-center justify-center bg-white/60 shadow-sm transition-all group-hover:bg-white group-hover:shadow-md">
                            <img src="https://i.ibb.co/b4btFQd/Design-sssnome.png" alt="Glicemia" className="w-10 h-10 object-contain" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#029491] uppercase tracking-wide">Glicemia</span>
                    </button>

                    <button
                        onClick={() => setActiveScreen('insulin')}
                        className="group flex flex-col items-center justify-center gap-1 transition-all active:scale-95 flex-1"
                    >
                        <div className="w-14 h-14 flex items-center justify-center bg-white/60 shadow-sm transition-all group-hover:bg-white group-hover:shadow-md">
                            <img src="https://i.ibb.co/0S6rDfn/dd.png" alt="Insulina" className="w-10 h-10 object-contain" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#029491] uppercase tracking-wide">Insulina</span>
                    </button>

                    <button
                        onClick={() => setActiveScreen('meals')}
                        className="group flex flex-col items-center justify-center gap-1 transition-all active:scale-95 flex-1"
                    >
                        <div className="w-14 h-14 flex items-center justify-center bg-white/60 shadow-sm transition-all group-hover:bg-white group-hover:shadow-md">
                            <img src="https://i.ibb.co/0yPR8hDC/Design-sem-nome-1.png" alt="Refeição" className="w-10 h-10 object-contain" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#029491] uppercase tracking-wide">Refeição</span>
                    </button>

                    <button
                        onClick={() => setActiveScreen('settings')}
                        className="group flex flex-col items-center justify-center gap-1 transition-all active:scale-95 flex-1"
                    >
                        <div className="w-14 h-14 flex items-center justify-center bg-white/60 shadow-sm transition-all group-hover:bg-white group-hover:shadow-md">
                            <img src="https://i.ibb.co/Vptysv4v/Design-config-nome-4.png" alt="Ajustes" className="w-12 h-12 object-contain" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#029491] uppercase tracking-wide">Ajustes</span>
                    </button>
                </div>
            </div>

            <ChatAssistant
                user={user}
                readings={readings}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onDataUpdate={fetchChartData}
                onMealEntry={onMealEntry}
                onInsulinEntry={onInsulinEntry}
            />
            <MedicalReportModal user={user} readings={readings} isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} />
            <ReminderManager isOpen={isRemindersOpen} onClose={() => { setIsRemindersOpen(false); fetchReminders(); }} />
            <GlucoseEntryModal
                isOpen={isGlucoseEntryOpen}
                onClose={() => setIsGlucoseEntryOpen(false)}
                onSuccess={async () => {
                    await fetchChartData();
                    await onGlucoseEntry(); // Award XP
                }}
            />

            {/* Gamification Notifications */}
            {notification?.type === 'xp' && notification.data.amount && notification.data.reason && (
                <XPNotification
                    amount={notification.data.amount}
                    reason={notification.data.reason}
                    onClose={closeNotification}
                />
            )}
            {notification?.type === 'levelup' && notification.data.newLevel && (
                <LevelUpNotification
                    newLevel={notification.data.newLevel}
                    onClose={closeNotification}
                />
            )}
            {notification?.type === 'badge' && notification.data.badge && (
                <BadgeUnlockedNotification
                    badgeName={notification.data.badge.name}
                    badgeIcon={notification.data.badge.icon}
                    badgeDescription={notification.data.badge.description}
                    onClose={closeNotification}
                />
            )}
        </div>
    );
};
