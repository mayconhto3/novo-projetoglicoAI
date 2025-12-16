import { supabase } from "./supabaseClient";
import { UserProfile, GlucoseReading, ChatMessage } from "../types";

// URL do Webhook do n8n (Opcional, para analytics paralelo)
const N8N_WEBHOOK_URL = 'https://toothlessgreenlandshark-n8n.cloudfy.live/webhook-test/chegandomensagem'; 

// Função auxiliar para enviar dados ao n8n (Fire and Forget - Apenas log)
const syncWithN8N = async (
    profile: UserProfile, 
    userMessage: string, 
    aiResponse: string,
    hasImage: boolean,
    hasAudio: boolean
) => {
    try {
        const cleanNumber = profile.phone.replace(/\D/g, '');

        await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: cleanNumber,        
                message: userMessage,       
                name: profile.name,
                ai_response: aiResponse,    
                has_image: hasImage,
                has_audio: hasAudio,
                timestamp: new Date().toISOString(),
                source: 'web_app_log'
            })
        });
    } catch (err) {
        console.warn('Failed to sync log with n8n:', err);
    }
};

export const sendMessageToAI = async (
  profile: UserProfile,
  history: ChatMessage[],
  newMessage: string,
  readings: GlucoseReading[],
  imageBase64?: string,
  audioBase64?: string,
  skipWebhook: boolean = false
): Promise<{ text: string, action?: any }> => {
  try {
    // 1. Preparar Mídia se houver
    let mediaType = null;
    let mediaBase64 = null;

    if (imageBase64) {
        mediaType = 'image';
        mediaBase64 = imageBase64;
    } else if (audioBase64) {
        mediaType = 'audio';
        mediaBase64 = audioBase64;
    }

    // 2. Chamar a Edge Function Unificada 'whatsapp-bridge'
    // AGORA LIMPO: Enviamos apenas o necessário. O Backend busca o histórico e leituras
    // no banco para garantir que a memória Longa e Curta sejam a mesma coisa.
    const { data, error } = await supabase.functions.invoke('whatsapp-bridge', {
        body: {
            number: profile.phone, // Chave principal para o backend encontrar o usuário
            message: newMessage,
            media_base64: mediaBase64,
            media_type: mediaType
        }
    });

    if (error) {
        console.error("Supabase Functions Error:", error);
        throw new Error(`Erro na Edge Function: ${error.message}`);
    }

    // O backend retorna { reply_content, ... } ou { text, ... } dependendo da versão, 
    // mas a versão limpa atual retorna: { reply_type: 'text', reply_content: '...' }
    const responseText = data?.reply_content || data?.text || "Desculpe, não consegui processar a resposta.";
    
    // A nova função limpa processa ações internamente e salva no banco. 
    // Não precisamos processar 'action_data' complexo no front, pois o backend já inseriu em 'glucose_readings' etc.
    // Mas se quisermos feedback visual imediato (sem esperar o realtime), podemos parsear se o backend enviar.
    const actionData = data?.action_data || null;

    // 3. Log opcional no N8N
    if (!skipWebhook) {
        syncWithN8N(
            profile, 
            newMessage || (imageBase64 ? '[FOTO]' : '[AUDIO]'), 
            responseText,
            !!imageBase64,
            !!audioBase64
        );
    }

    return { text: responseText, action: actionData };

  } catch (error: any) {
    console.error("Erro na comunicação com AI (Backend):", error);
    return { text: `⚠️ Serviço momentaneamente indisponível. Detalhe: ${error.message || 'Erro de conexão'}. Tente em 1 minuto.` };
  }
};

export const generateHealthInsight = async (
  profile: UserProfile,
  readings: GlucoseReading[]
): Promise<string> => {
  if (!profile || !readings) return "Olá! Comece registrando sua glicemia.";
  
  try {
    const result = await sendMessageToAI(
      profile, 
      [], 
      "Gere uma frase curta (max 15 palavras) motivadora ou de alerta baseada nos meus últimos dados de glicemia. Responda APENAS a frase, sem aspas.", 
      readings,
      undefined,
      undefined,
      true 
    );
    return result.text;
  } catch (e) {
      return "Mantenha o foco na sua saúde.";
  }
};

export const generateMedicalReport = async (
  profile: UserProfile,
  readings: GlucoseReading[],
  dateRangeLabel: string
): Promise<string> => {
  try {
    // Para relatórios, usamos a mesma ponte, mas pedimos explicitamente o relatório no prompt
    // A Edge Function é inteligente o suficiente para entender o pedido via texto
    const prompt = `Gere um relatório médico técnico detalhado referente aos ${dateRangeLabel}. Foque em variabilidade, hipoglicemias e tendências.`;
    
    const { data, error } = await supabase.functions.invoke('whatsapp-bridge', {
        body: {
            number: profile.phone,
            message: prompt
        }
    });

    if (error) throw error;

    return data?.reply_content || data?.text || "Não foi possível gerar o relatório.";
  } catch (error) {
    console.error("Erro ao gerar relatório médico:", error);
    return "Erro ao gerar relatório. Tente novamente mais tarde.";
  }
};