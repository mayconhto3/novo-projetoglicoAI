
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { GlucoseReading, UserProfile } from '../types';
import { 
    Activity, ArrowLeft, TrendingUp,
    Clock, Target, Calendar, Download, Share2, Info, AlertTriangle, CheckCircle2,
    Zap, Flag, Award, List, Droplet
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface GlucoseHistoryProps {
    userProfile: UserProfile;
    onBack: () => void;
}

type DateRange = 7 | 14 | 30 | 90;

export const GlucoseHistory: React.FC<GlucoseHistoryProps> = ({ userProfile, onBack }) => {
  const [allReadings, setAllReadings] = useState<GlucoseReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange>(14);

  useEffect(() => {
    fetchData();

    // --- REALTIME SUBSCRIPTION ---
    const channel = supabase
      .channel('glucose-history-updates')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'glucose_readings'
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
      filterDataByRange();
  }, [allReadings, selectedRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);

        const { data, error } = await supabase
            .from('glucose_readings')
            .select('*')
            .eq('user_id', user.id)
            .gte('timestamp', cutoffDate.toISOString())
            .order('timestamp', { ascending: true });

        if (error) throw error;

        const formattedReadings: GlucoseReading[] = (data || []).map(r => ({
            id: r.id,
            value: Number(r.value),
            timestamp: new Date(r.timestamp),
            type: r.type as any
        }));

        setAllReadings(formattedReadings);

    } catch (err) {
        console.error("Erro ao buscar histórico de glicemia:", err);
    } finally {
        setLoading(false);
    }
  };

  const filterDataByRange = () => {
      const now = new Date();
      const startDate = new Date();
      startDate.setDate(now.getDate() - selectedRange);

      const filtered = allReadings.filter(r => r.timestamp >= startDate);
      setFilteredReadings(filtered);
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      if (filteredReadings.length === 0) return null;

      const values = filteredReadings.map(r => r.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;

      // Std Dev for CV
      const squareDiffs = values.map(value => Math.pow(value - avg, 2));
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      const cv = (stdDev / avg) * 100;

      // GMI (Estimated A1c) formula: 3.31 + (0.02392 * mean_glucose)
      const gmi = 3.31 + (0.02392 * avg);

      // TIR
      const low = userProfile.targetGlucosePreMeal || 70;
      const high = userProfile.targetGlucosePostMeal || 180;
      
      const veryLowCount = values.filter(v => v < 54).length;
      const lowCount = values.filter(v => v >= 54 && v < low).length;
      const inRangeCount = values.filter(v => v >= low && v <= high).length;
      const highCount = values.filter(v => v > high && v <= 250).length;
      const veryHighCount = values.filter(v => v > 250).length;
      const total = values.length;

      return {
          avg: Math.round(avg),
          gmi: gmi.toFixed(1),
          cv: Math.round(cv),
          stdDev: Math.round(stdDev),
          tir: {
              veryLow: (veryLowCount / total) * 100,
              low: (lowCount / total) * 100,
              inRange: (inRangeCount / total) * 100,
              high: (highCount / total) * 100,
              veryHigh: (veryHighCount / total) * 100
          },
          readingsCount: total
      };
  }, [filteredReadings, userProfile]);

  // --- AGP CHART DATA ---
  const agpData = useMemo(() => {
      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, values: [] as number[] }));
      
      filteredReadings.forEach(r => {
          const h = r.timestamp.getHours();
          hours[h].values.push(r.value);
      });

      return hours.map(h => {
          const sorted = [...h.values].sort((a, b) => a - b);
          const len = sorted.length;
          
          if (len === 0) return { hour: `${h.hour}h`, p5: null, p25: null, median: null, p75: null, p95: null };

          const getPercentile = (p: number) => {
              const index = Math.floor(len * p);
              return sorted[Math.min(index, len - 1)];
          };

          return {
              hour: `${h.hour}h`,
              range5_95: [getPercentile(0.05), getPercentile(0.95)],
              range25_75: [getPercentile(0.25), getPercentile(0.75)],
              median: getPercentile(0.50)
          };
      });
  }, [filteredReadings]);

  // --- HOURLY TIR DATA ---
  const hourlyTirData = useMemo(() => {
      const blocks = [
          { label: 'Madrugada (0-6h)', start: 0, end: 6 },
          { label: 'Manhã (6-12h)', start: 6, end: 12 },
          { label: 'Tarde (12-18h)', start: 12, end: 18 },
          { label: 'Noite (18-24h)', start: 18, end: 24 },
      ];

      const low = userProfile.targetGlucosePreMeal || 70;
      const high = userProfile.targetGlucosePostMeal || 180;

      return blocks.map(block => {
          const readingsInBlock = filteredReadings.filter(r => {
              const h = r.timestamp.getHours();
              return h >= block.start && h < block.end;
          });

          if (readingsInBlock.length === 0) return { name: block.label, tir: 0 };

          const inRange = readingsInBlock.filter(r => r.value >= low && r.value <= high).length;
          return {
              name: block.label,
              tir: Math.round((inRange / readingsInBlock.length) * 100)
          };
      });
  }, [filteredReadings, userProfile]);

  // Safe worst block calculation
  const worstBlock = useMemo(() => {
    if (!hourlyTirData || hourlyTirData.length === 0) return null;
    return [...hourlyTirData].sort((a, b) => a.tir - b.tir)[0];
  }, [hourlyTirData]);

  const getGlucoseStatusColor = (value: number) => {
    if (value < 70) return 'bg-red-50 text-red-600 border-red-100';
    if (value > 250) return 'bg-orange-50 text-orange-600 border-orange-100';
    if (value > 180) return 'bg-yellow-50 text-yellow-600 border-yellow-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  const getGlucoseIcon = (type: string) => {
      switch(type) {
          case 'Fasting': return <Clock size={14} />;
          case 'Post-Meal': return <Activity size={14} />;
          case 'Correction': return <Droplet size={14} />;
          default: return <Activity size={14} />;
      }
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-right duration-300 bg-[#F8FAFC] min-h-screen">
      
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 shadow-sm p-4 rounded-b-[2rem]">
          <div className="flex items-center gap-3 mb-4">
              <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div className="bg-teal-50 p-2 rounded-2xl text-teal-600 border border-teal-100">
                 <Activity size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Análise Glicêmica</h1>
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-1 rounded-xl border border-gray-100">
             {[7, 14, 30, 90].map((days) => (
                 <button
                    key={days}
                    onClick={() => setSelectedRange(days as DateRange)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        selectedRange === days 
                        ? 'bg-white text-teal-600 shadow-sm border border-gray-100' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                 >
                     {days} Dias
                 </button>
             ))}
          </div>
      </div>

      <div className="p-4 space-y-6">

        {loading ? (
             <div className="h-64 flex items-center justify-center text-gray-400">Carregando dados...</div>
        ) : (
            <>
                {/* 1. DESAFIO DO MÊS (SEMPRE VISÍVEL) */}
                <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-[2rem] p-5 text-white relative overflow-hidden shadow-lg shadow-violet-200">
                         <div className="absolute right-[-20px] top-[-20px] bg-white/10 w-32 h-32 rounded-full blur-2xl"></div>
                         
                         <div className="flex items-center gap-2 mb-2 relative z-10">
                             <Award size={18} className="text-yellow-300" />
                             <h3 className="font-bold text-sm uppercase tracking-wider">Desafio do Mês</h3>
                         </div>
                         
                         <p className="font-bold text-lg mb-1 relative z-10">"30 Dias de Consistência"</p>
                         <p className="text-xs text-white/80 mb-4 relative z-10">Objetivo: Registrar ao menos 1 refeição todos os dias.</p>
                         
                         <div className="flex justify-between text-xs font-bold mb-1 relative z-10">
                             <span>Progresso: 22/30 dias</span>
                             <span>73%</span>
                         </div>
                         <div className="h-2.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm relative z-10">
                             <div style={{width: '73%'}} className="h-full bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                         </div>
                         
                         <p className="text-[10px] text-center mt-2 text-white/70 relative z-10">
                             Faltam 8 dias para completar! Recompensa: Badge Especial + 500 XP
                         </p>
                </div>

                {/* 2. ESTATÍSTICAS E GRÁFICOS (CONDICIONAL) */}
                {stats ? (
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2 flex items-center gap-2">
                            <Target size={14} /> Suas Metas
                        </h2>

                        {/* Meta Principal TIR */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-slate-700 text-sm">Meta: Tempo no Alvo &gt;70%</h3>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${stats.tir.inRange >= 70 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {Math.round(stats.tir.inRange)}% Atual
                                </span>
                            </div>
                            
                            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div 
                                    style={{ width: `${Math.min(stats.tir.inRange, 100)}%` }} 
                                    className={`h-full rounded-full transition-all duration-1000 ${stats.tir.inRange >= 70 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                />
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-4">
                                {stats.tir.inRange >= 70 
                                    ? "Parabéns! Você atingiu a meta internacional! 🚀" 
                                    : `Faltam apenas ${Math.round(70 - stats.tir.inRange)}% para atingir a meta! Continue firme.`
                                }
                            </p>

                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex gap-3 items-start">
                                <div className="bg-white p-1 rounded-full text-blue-500 shadow-sm mt-0.5">
                                    <Zap size={12} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-blue-800 mb-1">Dica para melhorar:</p>
                                    <p className="text-[11px] text-blue-600 leading-relaxed">
                                        {worstBlock ? `Seu maior desafio parece ser a ${worstBlock.name.split(' ')[0]} (${worstBlock.tir}%). Tente ajustar o basal.` : 'Mantenha o monitoramento constante.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Cards de Métricas */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">HbA1c Est.</span>
                                <span className="text-lg font-black text-slate-700">{stats.gmi}%</span>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                    <div style={{width: `${Math.min((parseFloat(stats.gmi)/7.0)*70, 100)}%`}} className={`h-full ${parseFloat(stats.gmi) < 7.0 ? 'bg-emerald-500' : 'bg-orange-400'}`}></div>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Variab. (CV)</span>
                                <span className="text-lg font-black text-slate-700">{stats.cv}%</span>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                    <div style={{width: `${Math.min((stats.cv/36)*80, 100)}%`}} className={`h-full ${stats.cv <= 36 ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">Aderência</span>
                                <span className="text-lg font-black text-slate-700">96%</span>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
                                    <div style={{width: '96%'}} className="h-full bg-emerald-500"></div>
                                </div>
                            </div>
                        </div>

                        {/* AGP CHART */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <TrendingUp size={16} /> Perfil Ambulatorial (AGP)
                                </h3>
                                <button className="text-gray-400 hover:text-teal-600">
                                    <Info size={16} />
                                </button>
                            </div>
                            <div className="h-64 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={agpData} margin={{top:10, right:10, bottom:0, left:0}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} interval={3} stroke="#94a3b8"/>
                                        <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" domain={[40, 350]}/>
                                        <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                        <Area type="monotone" dataKey="range5_95" stroke="none" fill="#E0F2F1" fillOpacity={1} name="5-95%" />
                                        <Area type="monotone" dataKey="range25_75" stroke="none" fill="#80CBC4" fillOpacity={0.6} name="25-75%" />
                                        <Line type="monotone" dataKey="median" stroke="#00695C" strokeWidth={2} dot={false} name="Mediana" />
                                        <ReferenceLine y={userProfile.targetGlucosePreMeal} stroke="#10b981" strokeDasharray="3 3" />
                                        <ReferenceLine y={userProfile.targetGlucosePostMeal} stroke="#f59e0b" strokeDasharray="3 3" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-4 text-[10px] text-slate-500 font-medium">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#E0F2F1] rounded-sm"></div> 5-95%</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#80CBC4] rounded-sm"></div> 25-75%</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[#00695C]"></div> Mediana</div>
                            </div>
                        </div>

                        {/* TIME IN RANGE BY HOUR */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-slate-700 text-sm mb-4">Tempo no Alvo por Período</h3>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourlyTirData} layout="vertical" margin={{top:0, right:30, bottom:0, left:0}}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                                        <XAxis type="number" hide domain={[0, 100]} />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill:'#64748b'}} tickLine={false} axisLine={false}/>
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:'8px'}}/>
                                        <Bar dataKey="tir" radius={[0, 4, 4, 0]} barSize={20} name="% no Alvo">
                                            {hourlyTirData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.tir >= 70 ? '#10b981' : entry.tir >= 50 ? '#f59e0b' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-40 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                        <Activity size={32} className="mb-2 opacity-30"/>
                        <p className="text-sm">Sem dados suficientes para gráficos nestes {selectedRange} dias.</p>
                    </div>
                )}

                {/* 3. HISTÓRICO DETALHADO (SEMPRE VISÍVEL) */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                            <List size={16} /> Histórico Detalhado
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">{filteredReadings.length} registros</span>
                    </div>
                    
                    {filteredReadings.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                            {[...filteredReadings].reverse().map(reading => (
                                <div key={reading.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${getGlucoseStatusColor(reading.value)}`}>
                                            {reading.value}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                                {reading.timestamp.toLocaleDateString()}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <Clock size={10} />
                                                {reading.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                        <span className="text-slate-400">
                                            {getGlucoseIcon(reading.type)}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-600">
                                            {reading.type === 'Pre-Meal' ? 'Pré-Ref.' : 
                                            reading.type === 'Post-Meal' ? 'Pós-Ref.' :
                                            reading.type === 'Fasting' ? 'Jejum' : 'Correção'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <List size={24} className="mb-2 opacity-30"/>
                            <p className="text-sm">Nenhum registro encontrado neste período.</p>
                        </div>
                    )}
                </div>

                {/* 4. AÇÕES EXTRAS */}
                {stats && (
                    <div className="grid grid-cols-2 gap-3 pb-8">
                        <button className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-gray-200 text-slate-600 hover:bg-slate-50 transition">
                            <Download size={24} className="text-teal-600"/>
                            <span className="text-xs font-bold">Baixar PDF</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-2xl border border-gray-200 text-slate-600 hover:bg-slate-50 transition">
                            <Share2 size={24} className="text-teal-600"/>
                            <span className="text-xs font-bold">Enviar ao Médico</span>
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};
