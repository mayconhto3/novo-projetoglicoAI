
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { GlucoseReading, Meal, InsulinRecord } from '../types';
import { Utensils, Syringe, Activity } from 'lucide-react';

interface GlucoseChartProps {
  data: GlucoseReading[];
  meals?: Meal[];
  insulin?: InsulinRecord[];
  targetLow: number;
  targetHigh: number;
}

const GlucoseChart: React.FC<GlucoseChartProps> = ({ data, meals = [], insulin = [], targetLow, targetHigh }) => {
  
  // Função auxiliar para encontrar eventos próximos (margem de 30 min)
  const findEventNear = (timestamp: Date, events: any[], type: 'meal' | 'insulin') => {
      const margin = 30 * 60 * 1000; // 30 minutes
      return events.find(e => {
          const t = new Date(e.created_at || e.timestamp).getTime();
          return Math.abs(t - timestamp.getTime()) < margin;
      });
  };

  const formattedData = data.map(d => {
      const mealEvent = findEventNear(d.timestamp, meals, 'meal');
      const insulinEvent = findEventNear(d.timestamp, insulin, 'insulin');

      return {
          time: d.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: d.value,
          timestamp: d.timestamp, // Guardamos para referência futura se precisar
          meal: mealEvent ? (mealEvent.description || 'Refeição') : null,
          mealCarbs: mealEvent ? mealEvent.carbs : null,
          insulin: insulinEvent ? (insulinEvent.insulin_type === 'Correção' ? 'Correção' : 'Bolus') : null,
          insulinUnits: insulinEvent ? insulinEvent.units : null
      };
  });

  // Custom Dot para renderizar ícones
  const CustomDot = (props: any) => {
      const { cx, cy, payload } = props;
      
      // Se não tem coordenadas, não renderiza
      if (!cx || !cy) return null;

      if (payload.meal) {
          return (
              <svg x={cx - 10} y={cy - 20} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                  <path d="M7 2v20" />
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
          );
      }
      
      if (payload.insulin) {
          return (
             <svg x={cx - 10} y={cy - 20} width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 2 4 4" />
                <path d="m17 7 3-3" />
                <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
                <path d="m9 11 4 4" />
                <path d="m5 19-3 3" />
                <path d="m14 4 6 6" />
            </svg>
          );
      }

      // Ponto normal se não tiver evento
      return (
          <circle cx={cx} cy={cy} r={4} fill="#0ea5e9" stroke="white" strokeWidth={2} />
      );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
              <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-xs z-50">
                  <p className="font-bold text-slate-700 mb-1">{label}</p>
                  
                  <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="font-bold text-lg text-blue-600">{data.value} <span className="text-xs text-slate-400 font-normal">mg/dL</span></span>
                  </div>

                  {data.meal && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50 text-orange-600">
                          <Utensils size={14} />
                          <div>
                              <p className="font-bold">{data.meal}</p>
                              {data.mealCarbs && <p className="text-[10px] text-orange-400">{data.mealCarbs}g carbs</p>}
                          </div>
                      </div>
                  )}

                  {data.insulin && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50 text-purple-600">
                          <Syringe size={14} />
                          <div>
                              <p className="font-bold">{data.insulin}</p>
                              {data.insulinUnits && <p className="text-[10px] text-purple-400">{data.insulinUnits}u aplicadas</p>}
                          </div>
                      </div>
                  )}
              </div>
          );
      }
      return null;
  };

  return (
    <div className="h-64 w-full bg-white rounded-xl p-2">
      <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4 pl-2 flex items-center gap-2">
          Glicemia & Eventos (24h)
          <div className="flex gap-2 ml-auto">
             <span className="flex items-center gap-1 text-[9px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded"><Utensils size={8}/> Comida</span>
             <span className="flex items-center gap-1 text-[9px] text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded"><Syringe size={8}/> Insulina</span>
          </div>
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 20, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            interval={3}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false}
            axisLine={false}
            domain={[40, 350]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={targetHigh} stroke="#ef4444" strokeDasharray="3 3" />
          <ReferenceLine y={targetLow} stroke="#10b981" strokeDasharray="3 3" />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#0ea5e9" 
            strokeWidth={3} 
            dot={<CustomDot />}
            activeDot={{ r: 6, strokeWidth: 0 }} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GlucoseChart;
