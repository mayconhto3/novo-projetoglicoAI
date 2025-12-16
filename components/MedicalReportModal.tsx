
import React, { useEffect, useState } from 'react';
import { UserProfile, GlucoseReading } from '../types';
import { generateMedicalReport } from '../services/geminiService';
import { X, Copy, FileText, Check, Loader2, Share2, Calendar, ChevronLeft, ArrowRight } from 'lucide-react';

interface MedicalReportModalProps {
  user: UserProfile;
  readings: GlucoseReading[];
  isOpen: boolean;
  onClose: () => void;
}

type RangeOption = 7 | 14 | 30 | 90;

export const MedicalReportModal: React.FC<MedicalReportModalProps> = ({ user, readings, isOpen, onClose }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedRange, setSelectedRange] = useState<RangeOption>(30);
  const [step, setStep] = useState<'config' | 'result'>('config');

  useEffect(() => {
    if (isOpen) {
      setStep('config');
      setReport('');
    }
  }, [isOpen]);

  const getFilteredReadings = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedRange);
    return readings.filter(r => new Date(r.timestamp) >= cutoffDate);
  };

  const generate = async () => {
    setLoading(true);
    const filteredReadings = getFilteredReadings();
    
    // Label for the prompt
    const label = `Últimos ${selectedRange} dias`;
    
    const text = await generateMedicalReport(user, filteredReadings, label);
    setReport(text);
    setStep('result');
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Relatório Médico - ${user.name}`,
                  text: report,
              });
          } catch (err) {
              console.error("Share failed", err);
          }
      } else {
          handleCopy();
      }
  };

  const reset = () => {
      setStep('config');
      setReport('');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col z-10 animate-in fade-in zoom-in duration-200">
        {/* Header - TEAL */}
        <div className="bg-teal-600 p-4 rounded-t-2xl flex justify-between items-center text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <h3 className="font-bold text-lg">Relatório Médico Inteligente</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 min-h-[300px]">
                <Loader2 size={40} className="animate-spin text-teal-600" />
                <div className="text-center">
                    <p className="text-slate-700 font-semibold">Gerando Relatório Clínico...</p>
                    <p className="text-slate-500 text-sm">A IA está analisando {selectedRange} dias de histórico.</p>
                </div>
              </div>
          ) : step === 'config' ? (
              <div className="space-y-6 animate-in slide-in-from-right duration-300">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100">
                          <Calendar size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-800">Selecione o Período</h2>
                      <p className="text-slate-500">Escolha o intervalo de tempo para análise clínica.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[7, 14, 30, 90].map((days) => (
                          <button
                            key={days}
                            onClick={() => setSelectedRange(days as RangeOption)}
                            className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                                selectedRange === days 
                                ? 'border-teal-600 bg-teal-50 text-teal-800' 
                                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-slate-50'
                            }`}
                          >
                              <div className="flex flex-col items-start">
                                  <span className="font-bold text-lg">
                                      {days === 7 ? '1 Semana' : days === 14 ? '2 Semanas' : days === 30 ? '1 Mês' : '3 Meses'}
                                  </span>
                                  <span className="text-xs opacity-70">Últimos {days} dias</span>
                              </div>
                              {selectedRange === days && <Check size={20} className="text-teal-600" />}
                          </button>
                      ))}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 items-start mt-4">
                      <div className="bg-blue-100 p-1.5 rounded-full text-blue-600 mt-0.5">
                         <FileText size={16} />
                      </div>
                      <div>
                          <p className="text-sm text-blue-800 font-medium">O que será analisado?</p>
                          <p className="text-xs text-blue-600 mt-1">
                              O relatório incluirá média glicêmica, variabilidade, episódios de hipoglicemia e adesão ao tratamento durante o período selecionado ({selectedRange} dias).
                          </p>
                      </div>
                  </div>
              </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800 animate-in slide-in-from-right duration-300">
              {report}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex gap-3 justify-between items-center flex-shrink-0">
          
          {step === 'result' ? (
              <button 
                onClick={reset}
                className="text-slate-500 hover:text-teal-600 flex items-center gap-1 text-sm font-medium transition"
              >
                  <ChevronLeft size={16} /> Alterar Período
              </button>
          ) : (
             <div className="text-xs text-slate-400">
                 {getFilteredReadings().length} medições encontradas
             </div>
          )}

          <div className="flex gap-2">
            {step === 'config' ? (
                 <button 
                    onClick={generate}
                    disabled={loading}
                    className="px-6 py-3 bg-teal-600 text-white hover:bg-teal-700 rounded-xl font-bold shadow-md shadow-teal-200 flex items-center gap-2 transition ml-auto"
                 >
                    Gerar Relatório <ArrowRight size={18} />
                 </button>
            ) : (
                <>
                    <button 
                        onClick={handleShare}
                        className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg font-medium shadow-md shadow-teal-200 flex items-center gap-2 transition"
                    >
                        {copied ? <Check size={18} /> : (navigator.share ? <Share2 size={18} /> : <Copy size={18} />)}
                        {copied ? 'Copiado!' : (navigator.share ? 'Compartilhar' : 'Copiar')}
                    </button>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
