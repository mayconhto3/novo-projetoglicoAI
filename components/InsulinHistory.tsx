
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { InsulinRecord } from '../types';
import { 
    Syringe, ArrowLeft, TrendingDown, TrendingUp, 
    Clock, Calculator, AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface InsulinHistoryProps {
    onBack: () => void;
}

export const InsulinHistory: React.FC<InsulinHistoryProps> = ({ onBack }) => {
  const [records, setRecords] = useState<InsulinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stats, setStats] = useState({
      todayTotal: 0,
      basalTotal: 0,
      bolusTotal: 0,
      weeklyAvg: 0,
      diffFromAvg: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);

        const { data, error } = await supabase
            .from('insulin_history')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', cutoffDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Ensure units are numbers (Supabase might return strings)
        const history: InsulinRecord[] = (data || []).map(item => ({
            ...item,
            units: Number(item.units)
        }));

        setRecords(history);
        calculateStats(history);

    } catch (err: any) {
        console.error("Erro ao buscar histórico de insulina:", err);
        let message = "Não foi possível carregar o histórico.";
        if (err && err.code === '42P01') {
             message = "Tabela 'insulin_history' não encontrada. Contate o suporte.";
        }
        setErrorMsg(message);
    } finally {
        setLoading(false);
    }
  };

  const calculateStats = (data: InsulinRecord[]) => {
      const now = new Date();
      const todayString = now.toLocaleDateString();

      const todayRecords = data.filter(r => new Date(r.created_at).toLocaleDateString() === todayString);
      
      const total = todayRecords.reduce((acc, curr) => acc + Number(curr.units), 0);
      const basal = todayRecords.filter(r => r.insulin_type === 'Basal').reduce((acc, curr) => acc + Number(curr.units), 0);
      const bolus = todayRecords.filter(r => r.insulin_type === 'Bolus' || r.insulin_type === 'Correção').reduce((acc, curr) => acc + Number(curr.units), 0);

      const last7DaysMap = new Map<string, number>();
      for (let i = 1; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7DaysMap.set(d.toLocaleDateString(), 0);
      }

      data.forEach(r => {
          const dStr = new Date(r.created_at).toLocaleDateString();
          if (last7DaysMap.has(dStr)) {
              last7DaysMap.set(dStr, last7DaysMap.get(dStr)! + Number(r.units));
          }
      });

      let sum7Days = 0;
      let countDays = 0;
      last7DaysMap.forEach(val => {
          if (val > 0) { 
            sum7Days += val;
            countDays++;
          }
      });
      
      const avg = countDays > 0 ? Math.round(sum7Days / countDays) : 0;
      const diff = avg > 0 ? total - avg : 0;

      setStats({
          todayTotal: total,
          basalTotal: basal,
          bolusTotal: bolus,
          weeklyAvg: avg,
          diffFromAvg: diff
      });

      const chartMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
        chartMap.set(key, 0);
      }
      
      data.forEach(r => {
          const d = new Date(r.created_at);
          const key = d.toLocaleDateString([], {day: '2-digit', month: '2-digit'});
          if (chartMap.has(key)) {
             chartMap.set(key, chartMap.get(key)! + Number(r.units));
          }
      });

      const formattedChartData = Array.from(chartMap).map(([date, units]) => ({
          date,
          units
      }));
      
      setChartData(formattedChartData);
  };

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-right duration-300 bg-[#F8FAFC] min-h-screen">
      
      {/* Header - Mint */}
      <div className="bg-white sticky top-0 z-10 shadow-sm p-4 rounded-b-[2rem]">
          <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                  <ArrowLeft size={20} />
              </button>
              <div className="bg-[#E0F2F1] p-2 rounded-2xl text-[#18A6A4]">
                  <Syringe size={20} />
              </div>
              <h1 className="text-xl font-bold text-gray-800">Insulina</h1>
          </div>
      </div>

      <div className="p-4 space-y-6">
          
          {errorMsg && (
              <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl text-sm flex items-start gap-2 border border-orange-100">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
              </div>
          )}

          {/* 1. Resumo */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-[#18A6A4] p-6 text-white relative overflow-hidden">
                  <div className="absolute right-[-30px] top-[-30px] bg-white/10 w-40 h-40 rounded-full blur-2xl"></div>
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">Total Hoje</h3>
                          <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-extrabold">{stats.todayTotal}</span>
                              <span className="text-lg font-medium text-white/70">un</span>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-xs text-white/70 mb-1">Média (7d)</div>
                          <div className="font-bold text-2xl">{stats.weeklyAvg}</div>
                      </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium bg-white/20 w-fit px-4 py-2 rounded-xl backdrop-blur-sm relative z-10">
                      {stats.diffFromAvg > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      <span>
                        {Math.abs(stats.diffFromAvg)}u {stats.diffFromAvg > 0 ? 'acima' : 'abaixo'} da média
                      </span>
                  </div>
              </div>
              
              <div className="p-5 grid grid-cols-2 gap-4 divide-x divide-gray-100 bg-white">
                  <div className="pl-2">
                       <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Basal (Lenta)</p>
                       <p className="text-xl font-bold text-gray-700">{stats.basalTotal}u</p>
                  </div>
                  <div className="pl-6">
                       <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Bolus (Rápida)</p>
                       <p className="text-xl font-bold text-gray-700">{stats.bolusTotal}u</p>
                  </div>
              </div>
          </div>

          {/* 2. Histórico */}
          <div>
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide px-2">
                  <Clock size={16} /> Aplicações Recentes
              </h3>
              
              <div className="space-y-4">
                  {loading ? (
                      [1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-[2rem] animate-pulse"/>)
                  ) : records.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400">
                          <p>Nenhuma aplicação encontrada nos últimos 30 dias.</p>
                      </div>
                  ) : (
                      records.slice(0, 20).map(rec => (
                          <div key={rec.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative group transition-all hover:scale-[1.02]">
                              {/* Border Color based on Type */}
                              <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${rec.insulin_type === 'Basal' ? 'bg-[#4CAF50]' : 'bg-[#18A6A4]'}`}></div>
                              
                              <div className="flex justify-between items-start pl-4">
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-gray-500">
                                            {new Date(rec.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                          </span>
                                          <span className="font-bold text-gray-800 text-lg">
                                              {rec.insulin_type === 'Correção' ? 'Correção' : rec.context || 'Aplicação'}
                                          </span>
                                      </div>
                                      <p className="text-xs text-gray-400 font-medium mt-1">
                                          {rec.insulin_brand || (rec.insulin_type === 'Basal' ? 'Basal' : 'Rápida')}
                                      </p>
                                  </div>
                                  <div className="bg-[#E0F2F1] px-3 py-1 rounded-lg">
                                      <div className="text-xl font-bold text-[#18A6A4]">{rec.units}u</div>
                                  </div>
                              </div>

                              {(rec.calculation_note || rec.glucose_before) && (
                                  <div className="mt-4 pl-4 border-l-2 border-gray-100 ml-2 space-y-2">
                                      {rec.glucose_before && (
                                          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                              <span>Glicemia: <b>{rec.glucose_before}</b></span>
                                              {rec.glucose_target && <span className="text-gray-400">→ Alvo: {rec.glucose_target}</span>}
                                          </div>
                                      )}
                                      {rec.calculation_note && (
                                          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg w-full">
                                              <Calculator size={12} className="mt-0.5 opacity-50" />
                                              <span className="font-mono">{rec.calculation_note}</span>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* 3. Gráfico */}
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-6 text-sm uppercase tracking-wide">
                  Tendência (30 dias)
              </h3>
              
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#18A6A4" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#18A6A4" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                              dataKey="date" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickMargin={10}
                              interval={5}
                              stroke="#94a3b8"
                          />
                          <YAxis 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              stroke="#94a3b8"
                          />
                          <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              cursor={{ stroke: '#18A6A4', strokeWidth: 1 }}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="units" 
                              stroke="#18A6A4" 
                              fillOpacity={1} 
                              fill="url(#colorUnits)" 
                              strokeWidth={3}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

      </div>
    </div>
  );
};
