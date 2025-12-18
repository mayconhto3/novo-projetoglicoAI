
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Meal } from '../types';
import { MealDetailsModal } from './MealDetailsModal';
import {
    Utensils,
    Flame,
    Syringe,
    MessageCircle,
    Star,
    ChevronRight,
    TrendingUp,
    ArrowLeft
} from 'lucide-react';

interface MealHistoryProps {
    onBack?: () => void;
}

export const MealHistory: React.FC<MealHistoryProps> = ({ onBack }) => {
    const [meals, setMeals] = useState<Meal[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'today' | 'yesterday' | 'week'>('today');
    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchMeals();
    }, [filter]);

    const fetchMeals = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let query = supabase
                .from('meal_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

            if (filter === 'today') {
                query = query.gte('created_at', startOfDay);
            } else if (filter === 'yesterday') {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                const startYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
                query = query.gte('created_at', startYesterday).lt('created_at', startOfDay);
            } else if (filter === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte('created_at', weekAgo.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            const mappedData = data?.map(item => ({
                ...item,
                meal_time: item.meal_label || item.meal_time,
                ai_feedback: item.assistant_comment || item.ai_feedback,
                carbs: item.estimated_carbs || item.carbs,
                calories: item.estimated_calories || item.calories
            })) || [];

            setMeals(mappedData);
        } catch (err) {
            console.error("Erro ao buscar refeições:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async (id: string, current: boolean) => {
        try {
            await supabase.from('meal_history').update({ favorite: !current }).eq('id', id);
            setMeals(prev => prev.map(m => m.id === id ? { ...m, favorite: !current } : m));
        } catch (err) {
            console.error(err);
        }
    };

    const impactFoods = [
        { name: 'Pizza', impact: '+95 mg/dl', risk: 'high' },
        { name: 'Macarrão', impact: '+78 mg/dl', risk: 'high' },
        { name: 'Arroz branco', impact: '+65 mg/dl', risk: 'medium' },
        { name: 'Pão francês', impact: '+58 mg/dl', risk: 'medium' },
    ];

    return (
        <div className="pb-24 animate-in fade-in slide-in-from-right duration-300 bg-[#F8FAFC] min-h-screen">

            {/* Header Fixo - Mint */}
            <div className="bg-white sticky top-0 z-10 shadow-sm p-4 rounded-b-[2rem]">
                <div className="flex items-center gap-3 mb-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <div className="bg-[#E0F2F1] p-2 rounded-2xl text-[#18A6A4]">
                        <Utensils size={24} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Refeições</h1>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button
                        onClick={() => setFilter('today')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'today' ? 'bg-[#18A6A4] text-white shadow-lg shadow-[#18A6A4]/30' : 'bg-gray-100 text-gray-500'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setFilter('yesterday')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'yesterday' ? 'bg-[#18A6A4] text-white shadow-lg shadow-[#18A6A4]/30' : 'bg-gray-100 text-gray-500'}`}
                    >
                        Ontem
                    </button>
                    <button
                        onClick={() => setFilter('week')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'week' ? 'bg-[#18A6A4] text-white shadow-lg shadow-[#18A6A4]/30' : 'bg-gray-100 text-gray-500'}`}
                    >
                        Semana
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6">

                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Carregando pratos...</div>
                    ) : meals.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                            <Utensils size={40} className="mx-auto mb-2 opacity-20" />
                            <p>Nenhuma refeição registrada.</p>
                        </div>
                    ) : (
                        meals.map(meal => (
                            <div key={meal.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                {/* Card Header */}
                                <div className="bg-[#E0F2F1] p-4 border-b border-[#E0F2F1] flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{meal.meal_time === 'Café' ? '☕' : meal.meal_time === 'Almoço' ? '🍲' : '🌙'}</span>
                                        <span className="font-bold text-gray-700 text-sm">
                                            {meal.meal_time || 'Lanche'} • {new Date(meal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <button onClick={() => toggleFavorite(meal.id, meal.favorite)}>
                                        <Star size={20} className={meal.favorite ? "fill-[#FFD700] text-[#FFD700]" : "text-gray-300"} />
                                    </button>
                                </div>

                                <div className="p-5">
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex-shrink-0 overflow-hidden border border-gray-100">
                                            {meal.image_url ? (
                                                <img src={meal.image_url} alt="Meal" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <Utensils size={24} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-800 text-base leading-tight mb-2 truncate">
                                                {meal.description || 'Sem descrição'}
                                            </h3>
                                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                                <span className="bg-[#E0F2F1] text-[#18A6A4] px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <Utensils size={12} /> {meal.carbs}g
                                                </span>
                                                {meal.calories && (
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg flex items-center gap-1">
                                                        <Flame size={12} /> {meal.calories} kcal
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dados Clínicos - Usando Brand Green para insulina */}
                                    <div className="mt-4 grid grid-cols-1 gap-2 bg-gray-50 p-4 rounded-2xl text-xs">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 text-gray-500 font-medium">
                                                <Syringe size={14} className="text-[#18A6A4]" />
                                                <span>Insulina</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-gray-400">Sug: {meal.insulin_suggested ? `${meal.insulin_suggested}u` : '--'}</span>
                                                {meal.insulin_taken && <span className="font-bold text-[#18A6A4] bg-[#E0F2F1] px-2 py-0.5 rounded-md">{meal.insulin_taken}u</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {meal.ai_feedback && (
                                        <div className="mt-3 flex gap-2 text-xs text-gray-600 bg-[#E0F2F1] p-3 rounded-xl border border-[#18A6A4]/10">
                                            <MessageCircle size={16} className="text-[#18A6A4] flex-shrink-0" />
                                            <p className="leading-relaxed">"{meal.ai_feedback}"</p>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={() => {
                                                setSelectedMeal(meal);
                                                setIsModalOpen(true);
                                            }}
                                            className="text-sm font-bold text-[#18A6A4] hover:text-[#00897B] flex items-center gap-1"
                                        >
                                            Detalhes <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-orange-50 p-4 flex items-center gap-2">
                        <Flame size={20} className="text-orange-500" />
                        <h3 className="font-bold text-orange-800 text-sm uppercase">Cuidado com estes</h3>
                    </div>
                    <div className="p-5">
                        <ul className="space-y-4">
                            {impactFoods.map((food, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-orange-200 w-4">{idx + 1}.</span>
                                        <span className="font-bold text-gray-700">{food.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-orange-500 font-bold">{food.impact}</span>
                                        <TrendingUp size={16} className="text-orange-300" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <MealDetailsModal
                    isOpen={isModalOpen}
                    meal={selectedMeal}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={fetchMeals}
                />
            </div>
        </div>
    );
};
