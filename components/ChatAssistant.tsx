import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage, GlucoseReading } from '../types';
import { sendMessageToAI } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import { Send, Image as ImageIcon, X, Loader2, Mic, Square, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ChatAssistantProps {
  user: UserProfile;
  readings: GlucoseReading[];
  isOpen: boolean;
  onClose: () => void;
  onDataUpdate?: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ user, readings, isOpen, onClose, onDataUpdate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- Realtime & History Sync ---
  useEffect(() => {
    if (!isOpen) return;
    
    let subscription: any = null;

    const setupRealtime = async () => {
        setLoadingHistory(true);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;

            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;

            if (data && data.length > 0) {
                const mappedMessages: ChatMessage[] = data.map(m => ({
                    id: m.id,
                    role: m.role as 'user' | 'model',
                    text: m.content,
                    timestamp: new Date(m.created_at),
                    image: undefined 
                }));
                setMessages(mappedMessages);
            } else {
                 setMessages([{
                    id: 'init',
                    role: 'model',
                    text: `Olá, ${user.name.split(' ')[0]}! Sou seu assistente GlucoAI. Como está sua glicemia agora?`,
                    timestamp: new Date()
                }]);
            }

            const channel = supabase.channel('chat-updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_history',
                        filter: `user_id=eq.${currentUser.id}`
                    },
                    (payload) => {
                        const newMsg = payload.new;
                        setMessages(prev => {
                            const exists = prev.some(m => m.text === newMsg.content && Math.abs(m.timestamp.getTime() - new Date(newMsg.created_at).getTime()) < 2000);
                            if (exists) return prev;

                            return [...prev, {
                                id: newMsg.id,
                                role: newMsg.role as 'user' | 'model',
                                text: newMsg.content,
                                timestamp: new Date(newMsg.created_at)
                            }];
                        });
                    }
                )
                .subscribe();
            
            subscription = channel;

        } catch (err) {
            console.error('Error loading chat history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    setupRealtime();

    return () => {
        if (subscription) supabase.removeChannel(subscription);
    };
  }, [isOpen, user.name]);

  useEffect(() => {
      return () => {
          if (timerRef.current) window.clearInterval(timerRef.current);
      }
  }, []);

  const saveMessageToDb = async (role: 'user' | 'model', content: string, isAudio: boolean = false, isImage: boolean = false) => {
    try {
         const { data: { user: currentUser } } = await supabase.auth.getUser();
         if (!currentUser) return;

         await supabase.from('chat_history').insert({
             user_id: currentUser.id,
             role: role,
             content: content,
             is_audio: isAudio,
             is_image: isImage
         });
    } catch (err) {
        console.error("Failed to save message to DB", err);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
              }
          };

          mediaRecorder.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = () => {
                  const base64Audio = reader.result as string;
                  handleSend(base64Audio); 
              };
              stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
          setRecordingDuration(0);
          
          timerRef.current = window.setInterval(() => {
              setRecordingDuration(prev => prev + 1);
          }, 1000);

      } catch (err) {
          console.error("Error accessing microphone:", err);
          alert("Não foi possível acessar o microfone. Verifique as permissões.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
      }
  };

  const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- VISUALIZADOR DE INCERTEZA ---
  const handleAiActionFeedback = (actionData: any) => {
      if (!actionData || !actionData.events || !Array.isArray(actionData.events)) return;
      
      const feedbackItems: string[] = [];
      let isEstimate = false;

      actionData.events.forEach((evt: any) => {
          if (evt.type === 'insulin' && evt.units > 0) {
              feedbackItems.push(`Insulina: ${evt.units}u`);
          } else if (evt.type === 'glucose_reading' && evt.value > 0) {
              feedbackItems.push(`Glicemia: ${evt.value} mg/dL`);
          } else if (evt.type === 'meal') {
              isEstimate = true;
              const carbText = evt.carbs_range 
                ? `${evt.carbs_range[0]}-${evt.carbs_range[1]}g (Provável: ${evt.carbs}g)`
                : `${evt.carbs}g`;
              feedbackItems.push(`Refeição Estimada: ${carbText}`);
          }
      });
      
      if (feedbackItems.length > 0) {
          const sysMsg: ChatMessage = {
              id: 'sys-' + Date.now(),
              role: 'model',
              text: `${isEstimate ? '⚠️' : '✅'} Registrado: ${feedbackItems.join(', ')}`,
              timestamp: new Date()
          };
          setMessages(prev => [...prev, sysMsg]);
          
          if (onDataUpdate) onDataUpdate();
      }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsLoading(true);
        const compressedBase64 = await compressImage(file);
        setSelectedImage(compressedBase64);
      } catch (error) {
        console.error("Erro ao comprimir imagem:", error);
        alert("Erro ao processar imagem. Tente outra.");
      } finally {
        setIsLoading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (audioBase64?: string) => {
    if ((!inputText.trim() && !selectedImage && !audioBase64) || isLoading) return;

    let displayText = inputText.trim();
    if (audioBase64) displayText = "🎤 [Mensagem de Voz]";
    else if (selectedImage && !displayText) displayText = "📸 [Análise de Refeição]";

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: displayText,
      image: selectedImage || undefined,
      audio: audioBase64 || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    saveMessageToDb('user', displayText, !!audioBase64, !!newUserMsg.image);

    try {
      const response = await sendMessageToAI(
        user,
        messages, 
        displayText.replace('📸 [Análise de Refeição]', '').replace('🎤 [Mensagem de Voz]', ''),
        readings, 
        newUserMsg.image,
        newUserMsg.audio
      );

      if (response.action) {
          handleAiActionFeedback(response.action);
      }

      const newAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newAiMsg]);
      saveMessageToDb('model', response.text);

    } catch (error) {
      console.error(error);
      const errorMsg = "Desculpe, ocorreu um erro. Tente novamente.";
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: errorMsg,
          timestamp: new Date()
      }]);
      saveMessageToDb('model', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={onClose} />
      
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[600px] sm:rounded-2xl shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="bg-teal-600 p-4 rounded-t-none sm:rounded-t-2xl flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 p-1">
                 <img src="https://i.ibb.co/sBWYLd6/Kit-M-dico-Verde-Claro-M-dico-Logotipo-1000-x-1000-px-6.png" alt="GlucoAI" className="w-full h-full object-cover" />
            </div>
            <div>
                <h3 className="font-bold">GlucoAI Assistente</h3>
                <p className="text-xs text-teal-100 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/> 
                    Online
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {loadingHistory && (
              <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-teal-600" />
              </div>
          )}
          
          {!loadingHistory && messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                }`}
              >
                {msg.image && (
                  <img 
                    src={msg.image} 
                    alt="Upload" 
                    className="w-full h-40 object-cover rounded-lg mb-2" 
                  />
                )}
                <div className="flex items-start gap-2">
                    {/* Ícones de Status da Mensagem */}
                    {msg.text.includes('✅') && <CheckCircle2 size={16} className="text-teal-500 mt-0.5 shrink-0" />}
                    {msg.text.includes('⚠️') && <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />}
                    {msg.text.includes('[Mensagem de Voz]') && <Mic size={16} className="mt-0.5 shrink-0" />}
                    
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
                <span className={`text-[10px] block mt-1 text-right ${msg.role === 'user' ? 'text-teal-200' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-teal-600" />
                <span className="text-xs text-slate-500">
                    {isRecording ? 'Ouvindo...' : selectedImage ? 'Analisando imagem...' : 'Digitando...'}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-100">
          {selectedImage && (
            <div className="flex items-center gap-2 mb-2 bg-slate-100 p-2 rounded-lg">
              <img src={selectedImage} alt="Preview" className="w-10 h-10 object-cover rounded" />
              <span className="text-xs text-slate-500 flex-1 truncate">Imagem pronta para envio</span>
              <button onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          )}

          {isRecording ? (
             <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl p-3 animate-pulse">
                <div className="flex items-center gap-2 text-red-600 font-medium">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"/>
                    Gravando... {formatDuration(recordingDuration)}
                </div>
                <button 
                    onClick={stopRecording}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                    <Square size={20} fill="currentColor" />
                </button>
             </div>
          ) : (
            <div className="flex items-end gap-2">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition"
                    title="Enviar foto"
                >
                    <ImageIcon size={24} />
                </button>
                
                <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all flex items-center">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Digite ou envie áudio..."
                        className="w-full bg-transparent border-none focus:ring-0 p-3 max-h-32 resize-none text-sm"
                        rows={1}
                    />
                </div>
                
                {inputText.trim() || selectedImage ? (
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading}
                        className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 transition shadow-md shadow-teal-200"
                    >
                        <Send size={20} />
                    </button>
                ) : (
                    <button
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`p-3 rounded-xl transition shadow-md ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                    >
                        {isRecording ? <Square size={20} /> : <Mic size={20} />}
                    </button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};