
import React, { useState } from 'react';
import { 
    Trophy, Star, Flame, Target, Zap, Crown, 
    Lock, CheckCircle2, ShoppingBag, ArrowLeft, 
    TrendingUp, Gift, ShieldCheck
} from 'lucide-react';

interface GamificationProps {
    onBack: () => void;
}

export const Gamification: React.FC<GamificationProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'badges' | 'store'>('profile');

  // Dados Mockados conforme solicitado
  const player = {
      level: 8,
      title: 'Controlador Experiente',
      name: 'João Silva',
      xp: 3250,
      nextLevelXp: 4000,
      streak: 14,
      points: 3250,
      recordStreak: 21
  };

  const badges = [
      { id: 1, icon: <Star size={20} />, name: 'Primeira Semana', desc: '7 dias de uso', unlocked: true },
      { id: 2, icon: <Flame size={20} />, name: 'Sequência 7 Dias', desc: 'Registros seguidos', unlocked: true },
      { id: 3, icon: <Target size={20} />, name: 'No Alvo 70%', desc: 'TIR > 70% (24h)', unlocked: true },
      { id: 4, icon: <Zap size={20} />, name: 'Semana Perfeita', desc: 'Sem perder dados', unlocked: true },
      { id: 5, icon: <ShieldCheck size={20} />, name: 'Meta Atingida', desc: 'HbA1c na meta', unlocked: true },
      { id: 6, icon: <Gift size={20} />, name: 'Foto Pro (50)', desc: '50 fotos de pratos', unlocked: true },
      { id: 7, icon: <TrendingUp size={20} />, name: 'Exercício Regular', desc: '4x na semana', unlocked: true },
      { id: 8, icon: <Crown size={20} />, name: 'Mestre Nível 10', desc: 'Alcance o nível 10', unlocked: false },
      { id: 9, icon: <TrendingUp size={20} />, name: 'Mês de Ouro', desc: '30 dias seguidos', unlocked: false },
  ];

  const shopItems = [
      { id: 1, name: 'Avatar Especial', cost: 500, icon: '🎨', type: 'avatar' },
      { id: 2, name: 'Tema Premium (Escuro)', cost: 800, icon: '🌙', type: 'theme' },
      { id: 3, name: 'Conteúdo Exclusivo', cost: 300, icon: '📚', type: 'content' },
      { id: 4, name: 'Relatório Avançado', cost: 1500, icon: '📊', type: 'report' },
      { id: 5, name: 'Cupom 10% Farmácia', cost: 2000, icon: '🎁', type: 'coupon' },
  ];

  const renderProfile = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
              
              <div className="relative z-10 flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-white/20 rounded-full border-4 border-white/30 flex items-center justify-center text-3xl shadow-inner backdrop-blur-md">
                      👤
                  </div>
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                              Nível {player.level}
                          </span>
                          <span className="text-indigo-200 text-xs font-medium">{player.title}</span>
                      </div>
                      <h2 className="text-2xl font-bold">{player.name}</h2>
                  </div>
              </div>

              {/* XP Bar */}
              <div className="mb-2">
                  <div className="flex justify-between text-xs font-medium text-indigo-100 mb-1">
                      <span>XP: {player.points}</span>
                      <span>Próx: {player.nextLevelXp}</span>
                  </div>
                  <div className="h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                      <div 
                        style={{ width: `${(player.xp / player.nextLevelXp) * 100}%` }} 
                        className="h-full bg-gradient-to-r from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                      />
                  </div>
                  <p className="text-[10px] text-indigo-200 mt-2 text-center">
                      Faltam {player.nextLevelXp - player.xp} XP para o Nível {player.level + 1}! 🚀
                  </p>
              </div>
          </div>

          {/* Streak Card */}
          <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Sequência Atual</h3>
                  <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-800">{player.streak}</span>
                      <span className="text-slate-400 font-bold">dias</span>
                  </div>
                  <p className="text-xs text-orange-500 font-medium mt-1">Recorde: {player.recordStreak} dias</p>
              </div>
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
                  <Flame size={32} fill="currentColor" className="animate-pulse" />
              </div>
          </div>

          {/* How to Earn */}
          <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
               <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                   <Zap size={18} className="text-yellow-500 fill-current" /> Como Ganhar XP
               </h3>
               <ul className="space-y-3">
                   {[
                       { task: 'Registrar Refeição', xp: '+10 XP', check: true },
                       { task: 'Registrar Glicemia', xp: '+5 XP', check: true },
                       { task: 'Aplicar Insulina', xp: '+10 XP', check: false },
                       { task: 'Glicemia no Alvo (>16h)', xp: '+50 XP', check: false },
                       { task: 'Sequência 7 dias', xp: '+100 XP', check: true },
                   ].map((item, idx) => (
                       <li key={idx} className="flex justify-between items-center text-sm">
                           <div className="flex items-center gap-3">
                               <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.check ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'}`}>
                                   <CheckCircle2 size={12} />
                               </div>
                               <span className={item.check ? 'text-slate-600 font-medium' : 'text-slate-400'}>{item.task}</span>
                           </div>
                           <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">{item.xp}</span>
                       </li>
                   ))}
               </ul>
          </div>
      </div>
  );

  const renderBadges = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
          <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Suas Conquistas</h2>
              <p className="text-slate-500 text-sm">{badges.filter(b => b.unlocked).length} de {badges.length} desbloqueadas</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
              {badges.map(badge => (
                  <div key={badge.id} className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 text-center border-2 transition-all ${badge.unlocked ? 'bg-white border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${badge.unlocked ? 'bg-amber-100 text-amber-500' : 'bg-slate-200 text-slate-400'}`}>
                          {badge.unlocked ? badge.icon : <Lock size={16} />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 leading-tight">{badge.name}</span>
                  </div>
              ))}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-[2rem] border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-2 text-sm">Próxima Conquista: Mês de Ouro</h3>
              <p className="text-xs text-blue-700 mb-3">Registre dados por 30 dias seguidos.</p>
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="w-[70%] h-full bg-blue-500 rounded-full"></div>
              </div>
              <p className="text-[10px] text-right text-blue-600 mt-1 font-bold">21 / 30 dias</p>
          </div>
      </div>
  );

  const renderStore = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
           <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-slate-900/50"></div>
               <div className="relative z-10">
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Seu Saldo</p>
                   <h2 className="text-4xl font-black text-amber-400 flex items-center justify-center gap-2">
                       {player.points} <span className="text-2xl">💎</span>
                   </h2>
               </div>
           </div>

           <div className="space-y-4">
               {shopItems.map(item => (
                   <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                       <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl">
                               {item.icon}
                           </div>
                           <div>
                               <h4 className="font-bold text-slate-700 text-sm">{item.name}</h4>
                               <p className="text-xs text-slate-400 capitalize">{item.type}</p>
                           </div>
                       </div>
                       <button className={`px-4 py-2 rounded-xl text-xs font-bold transition ${player.points >= item.cost ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                           {item.cost} 💎
                       </button>
                   </div>
               ))}
           </div>
      </div>
  );

  return (
    <div className="pb-24 bg-[#F8FAFC] min-h-screen">
       {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm p-4 rounded-b-[2rem]">
          <div className="flex items-center gap-3 mb-4">
              <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div className="bg-amber-50 p-2 rounded-2xl text-amber-500 border border-amber-100">
                 <Trophy size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Gamificação</h1>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
             {['profile', 'badges', 'store'].map((tab) => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all capitalize ${
                        activeTab === tab 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                 >
                     {tab === 'profile' ? 'Perfil' : tab === 'badges' ? 'Conquistas' : 'Loja'}
                 </button>
             ))}
          </div>
      </div>

      <div className="p-4">
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'badges' && renderBadges()}
          {activeTab === 'store' && renderStore()}
      </div>
    </div>
  );
};
