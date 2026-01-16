// OS-16 Fase 2: Login Premium
// Responsabilidade: Tela de login com visual HealthTech profissional
// Data: 2026-01-03
// Estratégia: Construção paralela - não substitui Auth.tsx ainda

import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Heart, Activity } from 'lucide-react';

export const LoginPremium: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FUNÇÕES DE AUTENTICAÇÃO (Mesmas do Auth.tsx)
  // ============================================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      console.log('[LoginPremium] Login bem-sucedido:', data.user?.id);
      // App.tsx detectará a mudança de sessão e navegará automaticamente
    } catch (err: any) {
      console.error('[LoginPremium] Erro no login:', err);
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (signUpError) throw signUpError;

      console.log('[LoginPremium] Cadastro bem-sucedido:', data.user?.id);
      // App.tsx detectará a mudança de sessão e navegará para questionário
    } catch (err: any) {
      console.error('[LoginPremium] Erro no cadastro:', err);
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-premium">
      {/* Background com Gradient */}
      <div className="login-background">
        {/* Formas decorativas */}
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      {/* Container Principal */}
      <div className="login-container">
        {/* Card Glassmorphism */}
        <div className="glass-card">
          {/* Ilustração Médica */}
          <div className="medical-illustration">
            <div className="icon-group">
              <Heart className="icon-heart" size={48} />
              <Activity className="icon-activity" size={48} />
            </div>
          </div>

          {/* Logo e Título */}
          <div className="header">
            <h1 className="logo">Glicie</h1>
            <p className="tagline">
              Seu assistente inteligente de diabetes
            </p>
          </div>

          {/* Tabs (Login/Cadastro) */}
          <div className="tabs">
            <button
              onClick={() => setIsLogin(true)}
              className={`tab ${isLogin ? 'active' : ''}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`tab ${!isLogin ? 'active' : ''}`}
            >
              Criar Conta
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="form">
            {/* Nome (apenas no cadastro) */}
            {!isLogin && (
              <div className="input-group">
                <label htmlFor="name">Nome Completo</label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João Silva"
                    className="premium-input"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="premium-input"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div className="input-group">
              <label htmlFor="password">Senha</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="premium-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-password"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-premium"
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="footer">
            <p className="footer-text">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              {' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="link-button"
              >
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        /* ====================================================================
           BACKGROUND E LAYOUT
           ==================================================================== */
        .login-premium {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #029491 0%, #0d4a4b 100%);
          z-index: 0;
        }

        /* Formas decorativas animadas */
        .shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
          animation: float 20s infinite ease-in-out;
        }

        .shape-1 {
          width: 400px;
          height: 400px;
          background: #56da98;
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .shape-2 {
          width: 300px;
          height: 300px;
          background: #b3ffd2;
          bottom: -50px;
          right: -50px;
          animation-delay: 5s;
        }

        .shape-3 {
          width: 200px;
          height: 200px;
          background: #ffffff;
          top: 50%;
          right: 10%;
          animation-delay: 10s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          padding: 24px;
        }

        /* ====================================================================
           GLASSMORPHISM CARD
           ==================================================================== */
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ====================================================================
           ILUSTRAÇÃO MÉDICA
           ==================================================================== */
        .medical-illustration {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }

        .icon-group {
          position: relative;
          width: 120px;
          height: 80px;
        }

        .icon-heart {
          position: absolute;
          left: 0;
          top: 0;
          color: #029491;
          animation: heartbeat 2s infinite ease-in-out;
        }

        .icon-activity {
          position: absolute;
          right: 0;
          bottom: 0;
          color: #56da98;
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        /* ====================================================================
           HEADER
           ==================================================================== */
        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          font-size: var(--font-size-4xl);
          font-weight: var(--font-weight-extrabold);
          background: linear-gradient(135deg, #029491 0%, #56da98 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 8px 0;
        }

        .tagline {
          font-size: var(--font-size-sm);
          color: var(--color-gray-600);
          margin: 0;
        }

        /* ====================================================================
           TABS
           ==================================================================== */
        .tabs {
          display: flex;
          gap: 8px;
          background: var(--color-gray-100);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .tab {
          flex: 1;
          padding: 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-gray-600);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tab.active {
          background: white;
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        /* ====================================================================
           FORMULÁRIO
           ==================================================================== */
        .form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-group label {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-gray-700);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: var(--color-gray-400);
          pointer-events: none;
        }

        .premium-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 2px solid var(--color-gray-200);
          border-radius: 12px;
          font-size: var(--font-size-base);
          color: var(--color-gray-900);
          transition: all var(--transition-normal);
          background: white;
        }

        .premium-input::placeholder {
          color: var(--color-gray-400);
        }

        .premium-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(2, 148, 145, 0.1);
        }

        .toggle-password {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--color-gray-400);
          transition: color var(--transition-fast);
          border-radius: var(--radius-sm);
        }

        .toggle-password:hover {
          color: var(--color-gray-600);
        }

        /* ====================================================================
           MENSAGEM DE ERRO
           ==================================================================== */
        .error-message {
          padding: 12px 16px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          color: #dc2626;
          font-size: var(--font-size-sm);
        }

        /* ====================================================================
           BOTÃO PREMIUM
           ==================================================================== */
        .btn-premium {
          width: 100%;
          padding: 16px 32px;
          border: none;
          border-radius: 12px;
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          color: white;
          background: linear-gradient(135deg, #029491 0%, #56da98 100%);
          box-shadow: 0 10px 20px rgba(2, 148, 145, 0.3);
          cursor: pointer;
          transition: all var(--transition-normal);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-premium:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(2, 148, 145, 0.4);
        }

        .btn-premium:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-premium:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ====================================================================
           FOOTER
           ==================================================================== */
        .footer {
          margin-top: 24px;
          text-align: center;
        }

        .footer-text {
          font-size: var(--font-size-sm);
          color: var(--color-gray-600);
          margin: 0;
        }

        .link-button {
          background: none;
          border: none;
          color: var(--color-primary);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .link-button:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }

        /* ====================================================================
           RESPONSIVIDADE
           ==================================================================== */
        @media (max-width: 640px) {
          .glass-card {
            padding: 32px 24px;
          }

          .logo {
            font-size: var(--font-size-3xl);
          }
        }
      `}</style>
    </div>
  );
};
