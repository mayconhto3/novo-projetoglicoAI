
import React, { useEffect, useState, useRef } from 'react';
import { UserProfile } from '../types';
import { ActionNotification, NotificationType } from './ActionNotification';
import { GlucoseEntryModal } from './GlucoseEntryModal';
import { MealHistory } from './MealHistory'; // We might redirect here
import { supabase } from '../services/supabaseClient';

interface NotificationManagerProps {
  user: UserProfile;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ user }) => {
  const [activeNotif, setActiveNotif] = useState<{
    type: NotificationType;
    title: string;
    message: string;
  } | null>(null);

  const [showGlucoseModal, setShowGlucoseModal] = useState(false);
  const [redirectMeal, setRedirectMeal] = useState(false); // Helper to handle redirect if needed

  // Keep track of notified times today to avoid spamming
  const notifiedMap = useRef<Set<string>>(new Set());

  // Check permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Timer Tick
  useEffect(() => {
    const checkTime = () => {
      if (!user.notificationSettings) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString();
      const uniqueKey = `${dateStr}-${timeStr}`;

      if (notifiedMap.current.has(uniqueKey)) return;

      // 1. MEAL REMINDERS
      if (user.notificationSettings.breakfast && timeStr === user.mealTimes.breakfast) {
         triggerNotification('meal', 'Café da Manhã ☕', `São ${timeStr}. Hora do seu café da manhã.`, uniqueKey);
      }
      else if (user.notificationSettings.lunch && timeStr === user.mealTimes.lunch) {
         triggerNotification('meal', 'Hora do Almoço 🍲', `São ${timeStr}. Não esqueça de registrar sua refeição.`, uniqueKey);
      }
      else if (user.notificationSettings.dinner && timeStr === user.mealTimes.dinner) {
         triggerNotification('meal', 'Hora do Jantar 🌙', `São ${timeStr}. Hora da sua última refeição grande.`, uniqueKey);
      }

      // 2. BASAL INSULIN
      if (user.basalInsulin?.morningTime && timeStr === user.basalInsulin.morningTime) {
         triggerNotification('insulin', 'Insulina Basal 💉', `Hora da sua basal da manhã (${user.basalInsulin.brand}).`, uniqueKey);
      }
      if (user.basalInsulin?.nightTime && timeStr === user.basalInsulin.nightTime) {
         triggerNotification('insulin', 'Insulina Basal 💉', `Hora da sua basal da noite (${user.basalInsulin.brand}).`, uniqueKey);
      }

    };

    const interval = setInterval(checkTime, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user]);

  const triggerNotification = (type: NotificationType, title: string, body: string, key: string) => {
    // 1. Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }

    // 2. In-App Rich Notification
    setActiveNotif({ type, title, message: body });
    notifiedMap.current.add(key);
  };

  const handleAction = (action: string) => {
    if (action === 'measure') {
      setShowGlucoseModal(true);
    } 
    else if (action === 'logged_meal') {
      // Just close for now, or redirect to meal logging
      // In a real app we might open the meal modal directly
      alert("Ótimo! Não esqueça de registrar os carboidratos quando puder.");
    }
    else if (action === 'snooze') {
       // Logic to snooze would be complex here without backend job, 
       // but we can simulate by removing from notifiedMap after 15 mins.
       const now = new Date();
       alert("Lembrete adiado por 15 minutos.");
    }
    
    setActiveNotif(null);
  };

  return (
    <>
      <ActionNotification 
        visible={!!activeNotif}
        type={activeNotif?.type || 'meal'}
        title={activeNotif?.title || ''}
        message={activeNotif?.message || ''}
        onClose={() => setActiveNotif(null)}
        onSnooze={() => handleAction('snooze')}
        onAction={handleAction}
      />
      
      <GlucoseEntryModal 
        isOpen={showGlucoseModal}
        onClose={() => setShowGlucoseModal(false)}
        onSuccess={() => {}} // Dashboard refreshes automatically on changes usually
      />
    </>
  );
};
