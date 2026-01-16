
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Cadastro realizado! Verifique seu email ou faça login.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    // Gradient from Mint #18A6A4 to slightly darker Teal
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#18A6A4] to-[#00897B] p-6">

      <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top duration-500">
        <img
          src="https://i.ibb.co/5XGDxTY6/Kit-M-dico-Verde-Claro-M-dico-Logotipo-1000-x-1000-px-1-1.png"
          alt="Glicie Logo"
          className="w-48 sm:w-56 object-contain mb-1"
        />
        <p className="text-white text-lg font-medium text-center opacity-90 mt-2">
          Seu assistente inteligente para diabetes
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? 'Bem-vindo' : 'Crie sua conta'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin ? 'Insira seus dados para entrar' : 'Preencha os dados abaixo'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-wide">Email</label>
            <div className="relative">
              <div className="absolute left-4 top-3.5 text-[#18A6A4]">
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#F5F7F8] border border-transparent rounded-2xl focus:bg-white focus:border-[#18A6A4] focus:ring-4 focus:ring-[#18A6A4]/10 outline-none transition-all font-medium text-gray-700"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-wide">Senha</label>
            <div className="relative">
              <div className="absolute left-4 top-3.5 text-[#18A6A4]">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-[#F5F7F8] border border-transparent rounded-2xl focus:bg-white focus:border-[#18A6A4] focus:ring-4 focus:ring-[#18A6A4]/10 outline-none transition-all font-medium text-gray-700"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-[#18A6A4] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-2xl text-sm text-center font-medium ${message.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-[#E0F2F1] text-[#00897B]'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#18A6A4] text-white rounded-2xl font-bold hover:bg-[#159694] transition-all shadow-lg shadow-[#18A6A4]/30 flex justify-center items-center gap-2 mt-4 hover:scale-[1.02] active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                {isLogin ? 'Entrar' : 'Criar nova conta'}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400 mb-2">
            {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
          </p>
          <button
            onClick={() => { setIsLogin(!isLogin); setMessage(null); }}
            className="text-[#18A6A4] font-bold hover:text-[#159694] transition-colors"
          >
            {isLogin ? 'Criar nova conta' : 'Fazer login'}
          </button>
        </div>
      </div>

      <p className="mt-8 text-white/70 text-xs text-center font-medium">
        © 2025 Glicie. Saúde e tecnologia.
      </p>
    </div>
  );
};
