
import React, { useEffect, useState } from 'react';
import { Bell, Utensils, Syringe, Activity, Clock, X, Check, Coffee, Moon, Sun } from 'lucide-react';

export type NotificationType = 'meal' | 'insulin' | 'glucose' | 'medication';

interface ActionNotificationProps {
  visible: boolean;
  type: NotificationType;
  title: string;
  message: string;
  onClose: () => void;
  onSnooze: () => void;
  onAction: (action: string) => void;
}

export const ActionNotification: React.FC<ActionNotificationProps> = ({ 
  visible, type, title, message, onClose, onSnooze, onAction 
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      // Play sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed (interaction needed)'));
      } catch (e) {}
    } else {
      setTimeout(() => setShow(false), 300);
    }
  }, [visible]);

  if (!visible && !show) return null;

  const getIcon = () => {
    switch(type) {
      case 'meal': return <Utensils size={24} className="text-orange-500" />;
      case 'insulin': return <Syringe size={24} className="text-purple-500" />;
      case 'glucose': return <Activity size={24} className="text-teal-500" />;
      default: return <Bell size={24} className="text-blue-500" />;
    }
  };

  const getColor = () => {
    switch(type) {
      case 'meal': return 'bg-orange-50 border-orange-100';
      case 'insulin': return 'bg-purple-50 border-purple-100';
      case 'glucose': return 'bg-teal-50 border-teal-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className={`fixed top-4 left-4 right-4 z-[100] transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
      <div className={`max-w-md mx-auto rounded-3xl shadow-2xl border ${getColor()} bg-white overflow-hidden`}>
        {/* Header */}
        <div className="p-4 flex items-start gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg leading-tight">{title}</h3>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 gap-0.5 bg-slate-100 border-t border-slate-100">
          
          {/* Ação Principal Dependendo do Tipo */}
          {type === 'meal' && (
            <button 
              onClick={() => onAction('logged_meal')}
              className="bg-white p-3 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-orange-600 font-bold text-sm"
            >
              <Check size={18} /> Já comi
            </button>
          )}

          {type === 'glucose' && (
            <button 
              onClick={() => onAction('measure')}
              className="bg-white p-3 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 text-teal-600 font-bold text-sm"
            >
              <Activity size={18} /> Medir Agora
            </button>
          )}

          {/* Opções Secundárias */}
          <div className="grid grid-cols-2 gap-0.5">
             <button 
                onClick={() => onAction('snooze')}
                className="bg-white p-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-slate-500 font-medium text-xs"
             >
               <Clock size={16} /> Adiar 15 min
             </button>
             <button 
                onClick={onClose}
                className="bg-white p-3 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-slate-500 font-medium text-xs"
             >
               Ignorar
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
