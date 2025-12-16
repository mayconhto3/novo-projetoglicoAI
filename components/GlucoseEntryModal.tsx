
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { X, Save, Activity, Clock, Calendar } from 'lucide-react';

interface GlucoseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GlucoseEntryModal: React.FC<GlucoseEntryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [value, setValue] = useState('');
  const [context, setContext] = useState('Pre-Meal');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;

    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('glucose_readings').insert({
            user_id: user.id,
            value: parseInt(value),
            type: context,
            timestamp: new Date().toISOString()
        });
        
        setValue('');
        onSuccess();
        onClose();
    } catch (err) {
        console.error("Erro ao registrar glicemia:", err);
        alert("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col z-10 animate-in zoom-in duration-200 overflow-hidden">
        <div className="bg-teal-600 p-4 flex justify-between items-center text-white">
            <h3 className="font-bold flex items-center gap-2">
                <Activity size={20} /> Registrar Glicemia
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex flex-col items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor da Glicemia</label>
                <div className="relative w-full max-w-[150px]">
                    <input 
                        type="number" 
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="--"
                        autoFocus
                        className="w-full text-center text-5xl font-bold text-teal-600 border-b-2 border-teal-100 focus:border-teal-500 outline-none py-2 placeholder-slate-200"
                        required
                    />
                    <span className="absolute right-0 bottom-4 text-slate-400 text-sm font-medium">mg/dL</span>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contexto</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 'Fasting', label: 'Jejum', icon: <Calendar size={14}/> },
                        { id: 'Pre-Meal', label: 'Pré-Refeição', icon: <Clock size={14}/> },
                        { id: 'Post-Meal', label: 'Pós-Refeição', icon: <Clock size={14}/> },
                        { id: 'Correction', label: 'Correção', icon: <Activity size={14}/> }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setContext(opt.id)}
                            className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                                context === opt.id 
                                ? 'bg-teal-50 border-teal-500 text-teal-700' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {opt.icon} {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
                {loading ? 'Salvando...' : <><Save size={18} /> Salvar Leitura</>}
            </button>
        </form>
      </div>
    </div>
  );
};
