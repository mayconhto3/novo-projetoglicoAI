import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
// OS-16: Premium UX Components (Big Switch - 2026-01-03)
import { LoginPremium } from './components/LoginPremium';
import { QuestionnaireWizard } from './components/QuestionnaireWizard';
// Backup: Auth e Questionnaire antigos mantidos em App.backup.tsx
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './types';
import { NotificationManager } from './components/NotificationManager';
import { GamificationService } from './services/gamificationService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para logout limpo
  const handleForceLogout = async () => {
    try {
      console.warn("Forçando logout devido a erro de sessão...");
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Erro ao tentar signOut:", e);
    } finally {
      // Limpeza nuclear para garantir que tokens corrompidos não persistam
      // Hardcoded para o projeto atual para evitar erros com import.meta.env
      localStorage.removeItem('sb-evgnmqmocqtwvhvmnsvq-auth-token');

      // Fallback: limpa tudo se não souber a chave exata
      if (localStorage.length > 0) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) localStorage.removeItem(key);
        });
      }

      setSession(null);
      setUserProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Verificar sessão ativa com tratamento de erro (Refresh Token)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Erros como "Invalid Refresh Token" ou "Refresh Token Not Found"
        handleForceLogout();
        return;
      }

      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // 2. Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setSession(session);

      if (session) {
        // Apenas busca o perfil se ainda não tivermos ou se o usuário mudou
        if (!userProfile || userProfile.email !== session.user.email) {
          fetchProfile(session.user.id);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // FIX 406: Usamos .limit(1) em vez de .single()
      // Isso usa header application/json padrão, que aceita [] sem erro HTTP
      const { data, error } = await supabase
        .from('profiles')
        .select('medical_data')
        .eq('id', userId)
        .limit(1);

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      // data é um array, pegamos o primeiro elemento (se existir)
      if (data && data.length > 0 && data[0].medical_data) {
        setUserProfile(data[0].medical_data as UserProfile);
      }
      // Se data for [], não é erro, apenas significa que o perfil não existe ainda
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!session) return;

    setLoading(true);
    try {
      // 1. Normalizar telefone
      let cleanNumber = profile.phone?.replace(/\D/g, '') || '';
      if (cleanNumber.length >= 10 && cleanNumber.length <= 11) {
        cleanNumber = '55' + cleanNumber;
      }

      // 2. Salvar perfil COMPLETO no Supabase
      // CRÍTICO: Salvar phone na COLUNA SQL (não apenas no JSON)
      // Isso permite que a WhatsApp Bridge encontre o usuário correto
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          name: profile.name,
          phone: cleanNumber, // ← OBRIGATÓRIO PARA A IA FUNCIONAR
          updated_at: new Date().toISOString(),
          medical_data: {
            ...profile,
            phone: cleanNumber
          }
        });

      if (profileError) throw profileError;

      // 3. Inicializar gamificação (recebe +50 XP de boas-vindas)
      await GamificationService.initializeGamification(session.user.id);

      // 4. Marcar tarefa básica como completa
      await GamificationService.completeProfileTask(session.user.id, 'basic_info');

      // 5. Trigger N8N Webhook (Welcome Message)
      const webhookUrl = 'https://toothlessgreenlandshark-n8n.cloudfy.live/webhook/novo-cadastro';

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: cleanNumber,
          name: profile.name,
          source: 'full_onboarding'
        })
      }).catch(err => console.warn('Failed to trigger onboarding webhook:', err));

      // 6. Atualizar estado
      setUserProfile(profile);
    } catch (error: any) {
      alert('Erro ao salvar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600" size={40} />
      </div>
    );
  }

  if (!session) {
    return <LoginPremium />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!userProfile ? (
        <QuestionnaireWizard onComplete={handleOnboardingComplete} />
      ) : (
        <>
          <NotificationManager user={userProfile} />
          <Dashboard user={userProfile} session={session} />
        </>
      )}
    </div>
  );
};

export default App;