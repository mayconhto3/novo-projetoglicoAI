
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Reminder } from '../types';
import { X, Plus, Bell, Trash2, Clock, Check, Pill, Syringe, Utensils, Droplet, Activity } from 'lucide-react';

interface ReminderManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReminderManager: React.FC<ReminderManagerProps> = ({ isOpen, onClose }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New Reminder Form
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState<Reminder['type']>('measurement');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
      requestNotificationPermission();
    }
  }, [isOpen]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  };

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('time', { ascending: true });
        
      if (error) throw error;
      if (data) setReminders(data);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newTime) return;

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from('reminders').insert({
        user_id: user.id,
        title: newTitle,
        time: newTime,
        type: newType,
        active: true
      }).select().single();

      if (error) throw error;
      if (data) {
        setReminders(prev => [...prev, data].sort((a, b) => a.time.localeCompare(b.time)));
        setNewTitle('');
        setNewTime('');
      }
    } catch (err) {
      alert('Erro ao criar lembrete');
    } finally {
      setAdding(false);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('reminders').update({ active: !currentStatus }).eq('id', id);
      if (error) throw error;
      setReminders(prev => prev.map(r => r.id === id ? { ...r, active: !currentStatus } : r));
    } catch (err) {
      console.error('Error toggling reminder:', err);
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'insulin': return <Syringe size={16} className="text-purple-500" />;
      case 'meal': return <Utensils size={16} className="text-orange-500" />;
      case 'medication': return <Pill size={16} className="text-blue-500" />;
      case 'measurement': return <Activity size={16} className="text-teal-500" />;
      case 'water': return <Droplet size={16} className="text-cyan-500" />;
      default: return <Bell size={16} className="text-slate-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
     switch (type) {
      case 'insulin': return 'Insulina';
      case 'meal': return 'Refeição';
      case 'medication': return 'Remédio';
      case 'measurement': return 'Glicemia';
      case 'water': return 'Água';
      default: return 'Outro';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col z-10 animate-in fade-in zoom-in duration-200 max-h-[85vh]">
        {/* Header - TEAL */}
        <div className="bg-teal-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Bell size={20} />
            <h3 className="font-bold text-lg">Lembretes & Alarmes</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            
            {/* Add New */}
            <form onSubmit={addReminder} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Plus size={16} /> Novo Lembrete
                </h4>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <input 
                            type="text" 
                            placeholder="Ex: Insulina Basal" 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            required
                        />
                    </div>
                    <input 
                        type="time" 
                        className="p-2 border border-slate-200 rounded-lg text-sm focus:border-teal-500 outline-none"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        required
                    />
                </div>
                <div className="flex gap-2 items-center">
                    <select 
                        className="flex-1 p-2 border border-slate-200 rounded-lg text-sm bg-white"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                    >
                        <option value="measurement">Medir Glicemia</option>
                        <option value="insulin">Aplicar Insulina</option>
                        <option value="meal">Refeição</option>
                        <option value="medication">Medicamento</option>
                        <option value="water">Beber Água</option>
                        <option value="other">Outro</option>
                    </select>
                    <button 
                        type="submit" 
                        disabled={adding}
                        className="bg-teal-600 text-white p-2 px-4 rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
                    >
                        {adding ? '...' : 'Adicionar'}
                    </button>
                </div>
            </form>

            {/* List */}
            <div className="space-y-2">
                {loading ? <p className="text-center text-slate-400 text-sm">Carregando...</p> : (
                    reminders.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Clock size={32} className="mx-auto mb-2 opacity-50" />
                            <p>Nenhum lembrete configurado.</p>
                        </div>
                    ) : (
                        reminders.map(rem => (
                            <div key={rem.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${rem.active ? 'bg-white border-slate-200' : 'bg-slate-100 border-transparent opacity-70'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${rem.active ? 'bg-slate-50' : 'bg-slate-200'}`}>
                                        {getTypeIcon(rem.type)}
                                    </div>
                                    <div>
                                        <p className={`font-semibold text-sm ${rem.active ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{rem.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Clock size={12} />
                                            <span>{rem.time}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span>{getTypeLabel(rem.type)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => toggleActive(rem.id, rem.active)}
                                        className={`p-2 rounded-full transition ${rem.active ? 'text-teal-600 hover:bg-teal-50' : 'text-slate-400 hover:bg-slate-200'}`}
                                    >
                                        <Check size={18} />
                                    </button>
                                    <button 
                                        onClick={() => deleteReminder(rem.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>
        
        <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl text-center">
             <p className="text-xs text-slate-400">Certifique-se de permitir notificações no navegador.</p>
        </div>
      </div>
    </div>
  );
};
