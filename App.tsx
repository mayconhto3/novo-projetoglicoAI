import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { Questionnaire } from './components/Questionnaire';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './types';
import { NotificationManager } from './components/NotificationManager';
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
      const { data, error } = await supabase
        .from('profiles')
        .select('medical_data')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 é "Row not found"
             console.error('Error fetching profile:', error);
        }
        // Se não achar perfil, não é erro fatal, apenas o usuário precisa preencher o questionário
      }

      if (data && data.medical_data) {
        setUserProfile(data.medical_data as UserProfile);
      }
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
      // 1. Save Profile to Supabase
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          name: profile.name,
          medical_data: profile
        });

      if (error) throw error;

      // 2. Trigger N8N Webhook (Welcome Message)
      const cleanNumber = profile.phone.replace(/\D/g, '');
      const webhookUrl = 'https://toothlessgreenlandshark-n8n.cloudfy.live/webhook/novo-cadastro';
      
      fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              number: cleanNumber,
              name: profile.name,
              source: 'onboarding'
          })
      }).catch(err => console.warn('Failed to trigger onboarding webhook:', err));

      // 3. Update State
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
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {!userProfile ? (
        <Questionnaire onComplete={handleOnboardingComplete} />
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