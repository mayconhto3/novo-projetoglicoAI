
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Meal, UserProfile } from '../types';
import { X, Save, Utensils, Syringe, Activity, Flame, Clock, Trash2, CheckCircle } from 'lucide-react';

interface MealDetailsModalProps {
  meal: Meal | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Trigger refresh on parent
}

export const MealDetailsModal: React.FC<MealDetailsModalProps> = ({ meal, isOpen, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<Meal>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meal) {
      setFormData({ ...meal });
    }
  }, [meal]);

  const handleChange = (field: keyof Meal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!meal || !formData) return;
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Update Meal History
        const { error } = await supabase
            .from('meal_history')
            .update({
                meal_time: formData.meal_time,
                description: formData.description,
                carbs: formData.carbs,
                calories: formData.calories,
                insulin_taken: formData.insulin_taken,
                insulin_suggested: formData.insulin_suggested,
                glucose_pre: formData.glucose_pre,
                glucose_post: formData.glucose_post,
                favorite: formData.favorite
            })
            .eq('id', meal.id);

        if (error) throw error;

        // 2. Sync Glucose Readings
        if (formData.glucose_pre && formData.glucose_pre !== meal.glucose_pre) {
            await supabase.from('glucose_readings').insert({
                user_id: user.id,
                value: formData.glucose_pre,
                type: 'Pre-Meal',
                timestamp: new Date(meal.created_at).toISOString()
            });
        }
        if (formData.glucose_post && formData.glucose_post !== meal.glucose_post) {
            const postTime = new Date(new Date(meal.created_at).getTime() + 2 * 60 * 60 * 1000);
            await supabase.from('glucose_readings').insert({
                user_id: user.id,
                value: formData.glucose_post,
                type: 'Post-Meal',
                timestamp: postTime.toISOString()
            });
        }

        // 3. Sync Insulin History
        // If insulin was taken, record it in insulin_history
        if (formData.insulin_taken) {
            // First, get user profile to find brand info
            let brand = 'Rápida';
            const { data: profileData } = await supabase.from('profiles').select('medical_data').eq('id', user.id).single();
            if (profileData && profileData.medical_data) {
                const p = profileData.medical_data as UserProfile;
                if (p.bolusInsulin?.brand) brand = p.bolusInsulin.brand;
            }

            // Check if record exists
            const { data: existingInsulin } = await supabase
                .from('insulin_history')
                .select('id')
                .eq('related_meal_id', meal.id)
                .maybeSingle();

            const insulinPayload = {
                user_id: user.id,
                insulin_type: 'Bolus',
                context: formData.meal_time || 'Refeição',
                insulin_brand: brand,
                units: formData.insulin_taken,
                related_meal_id: meal.id,
                glucose_before: formData.glucose_pre,
                calculation_note: formData.carbs ? `${formData.carbs}g carbo (Ratio 1:X)` : undefined,
                created_at: meal.created_at // Keep date synced with meal
            };

            if (existingInsulin) {
                await supabase.from('insulin_history').update(insulinPayload).eq('id', existingInsulin.id);
            } else {
                await supabase.from('insulin_history').insert(insulinPayload);
            }
        }

        onUpdate(); 
        onClose();
    } catch (err) {
        console.error("Erro ao salvar detalhes:", err);
        alert("Erro ao salvar alterações.");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen || !meal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col z-10 max-h-[90vh] overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header with Image Background if available */}
        <div className="relative bg-slate-100 min-h-[120px] flex flex-col justify-between">
            {formData.image_url ? (
                <img src={formData.image_url} className="absolute inset-0 w-full h-full object-cover opacity-90" alt="Meal" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                    <Utensils size={40} />
                </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

            <div className="relative z-10 flex justify-end p-3">
                <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition">
                    <X size={20} />
                </button>
            </div>
            
            <div className="relative z-10 p-4 text-white">
                <div className="flex items-center gap-2 text-sm font-medium opacity-90 mb-1">
                    <Clock size={14} />
                    {new Date(meal.created_at).toLocaleString()}
                </div>
                <input 
                    type="text" 
                    value={formData.description || ''} 
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="bg-transparent border-b border-white/30 text-lg font-bold w-full focus:outline-none focus:border-white placeholder-white/50"
                    placeholder="Descrição da refeição..."
                />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-white">
            
            {/* 1. Classificação */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Refeição</label>
                <div className="flex gap-2">
                    {['Café', 'Almoço', 'Jantar', 'Lanche'].map(t => (
                        <button 
                            key={t}
                            onClick={() => handleChange('meal_time', t)}
                            className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-all ${
                                formData.meal_time === t 
                                ? 'bg-orange-50 border-orange-500 text-orange-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Nutrição */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Utensils size={12} /> Carboidratos (g)
                    </label>
                    <input 
                        type="number" 
                        value={formData.carbs || ''} 
                        onChange={(e) => handleChange('carbs', parseFloat(e.target.value))}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-orange-200 outline-none"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Flame size={12} /> Calorias (kcal)
                    </label>
                    <input 
                        type="number" 
                        value={formData.calories || ''} 
                        onChange={(e) => handleChange('calories', parseFloat(e.target.value))}
                        className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-700 focus:ring-2 focus:ring-orange-200 outline-none"
                    />
                </div>
            </div>

            {/* 3. Insulina */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                <div className="flex items-center gap-2 text-purple-700 mb-1">
                    <Syringe size={18} />
                    <h3 className="font-bold text-sm">Insulina</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase text-purple-400 font-bold block mb-1">Sugerido (IA)</label>
                        <div className="p-2 bg-white/60 rounded-lg border border-purple-100 text-slate-500 text-sm font-medium">
                            {formData.insulin_suggested || '--'} u
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-purple-600 font-bold block mb-1">Aplicado</label>
                        <input 
                            type="number" 
                            value={formData.insulin_taken || ''} 
                            onChange={(e) => handleChange('insulin_taken', parseFloat(e.target.value))}
                            placeholder="0"
                            className="w-full p-2 bg-white rounded-lg border border-purple-200 font-bold text-purple-700 focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-purple-500 italic mt-2">
                    *Será sincronizado automaticamente com o Histórico de Insulina.
                </p>
            </div>

            {/* 4. Glicemia */}
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 space-y-3">
                <div className="flex items-center gap-2 text-teal-700 mb-1">
                    <Activity size={18} />
                    <h3 className="font-bold text-sm">Glicemia</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase text-teal-600 font-bold block mb-1">Pré-Refeição</label>
                        <input 
                            type="number" 
                            value={formData.glucose_pre || ''} 
                            onChange={(e) => handleChange('glucose_pre', parseFloat(e.target.value))}
                            placeholder="mg/dL"
                            className="w-full p-2 bg-white rounded-lg border border-teal-200 font-bold text-teal-700 focus:ring-2 focus:ring-teal-200 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-teal-600 font-bold block mb-1">Pós (2h)</label>
                        <input 
                            type="number" 
                            value={formData.glucose_post || ''} 
                            onChange={(e) => handleChange('glucose_post', parseFloat(e.target.value))}
                            placeholder="mg/dL"
                            className="w-full p-2 bg-white rounded-lg border border-teal-200 font-bold text-teal-700 focus:ring-2 focus:ring-teal-200 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* AI Comment Read-only */}
            {meal.ai_feedback && (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    🤖 "{meal.ai_feedback}"
                </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-3 rounded-xl font-medium text-slate-500 hover:bg-slate-50 transition"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 flex items-center gap-2 disabled:opacity-50 transition"
            >
                {loading ? 'Salvando...' : <><Save size={18} /> Salvar Detalhes</>}
            </button>
        </div>
      </div>
    </div>
  );
};
