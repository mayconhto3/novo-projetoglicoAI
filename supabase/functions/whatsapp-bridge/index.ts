import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TIPOS
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UserProfile {
  name: string;
  birthDate: string;
  gender: string;
  phone: string;
  weight: number;
  height: number;
  diabetesType: string;
  diagnosisYear: number;
  hba1c?: number;
  usesInsulin: boolean;
  insulinDuration?: number;
  basalInsulin?: {
    brand?: string;
    morningDose?: number;
    nightDose?: number;
  };
  bolusInsulin?: { brand?: string };
  icRatioBreakfast?: number;
  icRatioLunch?: number;
  icRatioDinner?: number;
  icRatioSnack?: number;
  isfMorning?: number;
  targetGlucosePreMeal: number;
  targetGlucosePostMeal: number;
  hypoglycemiaFrequency?: string;
  hypoglycemiaSymptoms?: string[];
  comorbidities?: string[];
  dietType?: string[];
  problematicFoods?: string[];
  carbCountingKnowledge?: string;
  exerciseFrequency: string;
  exerciseType?: string[];
  smoker: string;
  alcoholConsumption: string;
  medicationsAffectingGlucose?: string[];
  communicationStyle: string;
  caregiver?: { active: boolean; name: string };
}

interface GlucoseReading {
  value: number;
  timestamp: string;
  type: string;
}

interface ExtractedGlucoseData {
  value: number;
  type: 'Fasting' | 'Pre-Meal' | 'Post-Meal' | 'Correction';
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
}

// UTILITY FUNCTIONS FOR GLUCOSE EXTRACTION
function extractGlucoseFromText(message: string, timestamp: Date): ExtractedGlucoseData | null {
  if (!message) return null;

  const glucosePatterns = [
    // Padrão 1: Contexto completo "minha glicemia atual é 201"
    /(?:minha?|meu|a)\s*(?:glicemia|glicose|glucose|gli|açúcar)\s*(?:atual|agora|hoje|da\s*vez)?\s*(?:está?|tá|é|foi|deu|marcou|mediu?)\s*(?:em|de|a)?\s*(\d{2,3})/i,

    // Padrão 2: Verbo + número "medí 180", "testei 150"
    /(?:medí|medi|testei|chequei|verifiquei|conferi)\s*(?:e|a)?\s*(?:glicemia|glicose|glucose|gli)?\s*(?:está?|tá|é|foi|deu|marcou)?\s*(\d{2,3})/i,

    // Padrão 3: Palavra-chave + estado + número "glicose tá 150"
    /(?:glicemia|glicose|glucose|gli|açúcar)\s*(?:está?|tá|é|foi|deu|marcou)\s*(?:em|de|a)?\s*(\d{2,3})/i,

    // Padrão 4: Número + palavra-chave "201 de glicemia"
    /(\d{2,3})\s*(?:de|mg\/dl|mg)?\s*(?:glicemia|glicose|glucose|gli|açúcar)/i,

    // Padrão 5: Estado + número "está 180", "deu 95"
    /(?:está?|tá|é|foi|deu|marcou)\s*(\d{2,3})\s*(?:mg\/dl|mg)?$/i,

    // Padrão 6: Apenas número (mensagem curta)
    /^(\d{2,3})$/
  ];

  for (const pattern of glucosePatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1]);

      // Validate range (20-600 mg/dL) - expandido para capturar hipoglicemias severas
      if (value < 20 || value > 600) continue;

      const type = inferGlucoseContext(timestamp, message);
      const confidence = determineConfidence(message, pattern);

      return {
        value,
        type,
        timestamp: timestamp.toISOString(),
        confidence
      };
    }
  }

  return null;
}

function inferGlucoseContext(timestamp: Date, message: string): 'Fasting' | 'Pre-Meal' | 'Post-Meal' | 'Correction' {
  const hour = timestamp.getHours();
  const lowerMsg = message.toLowerCase();

  // Keyword-based inference (highest priority)
  if (lowerMsg.includes('jejum')) return 'Fasting';
  if (lowerMsg.includes('antes')) return 'Pre-Meal';
  if (lowerMsg.includes('depois') || lowerMsg.includes('pós')) return 'Post-Meal';
  if (lowerMsg.includes('correção') || lowerMsg.includes('correcao')) return 'Correction';

  // Time-based inference
  if (hour >= 6 && hour < 9) return 'Fasting';
  if (hour >= 11 && hour < 13) return 'Pre-Meal';
  if (hour >= 13 && hour < 15) return 'Post-Meal';
  if (hour >= 18 && hour < 20) return 'Pre-Meal';
  if (hour >= 20 && hour < 22) return 'Post-Meal';

  return 'Correction'; // Default
}

function determineConfidence(message: string, matchedPattern: RegExp): 'high' | 'medium' | 'low' {
  const lowerMsg = message.toLowerCase();

  // High confidence: explicit glucose measurement keywords
  if (lowerMsg.includes('medi') || lowerMsg.includes('glicemia') || lowerMsg.includes('mg/dl')) {
    return 'high';
  }

  // Medium confidence: contextual indicators
  if (lowerMsg.includes('deu') || lowerMsg.includes('está') || lowerMsg.includes('tá')) {
    return 'medium';
  }

  return 'low';
}

// PROMPT DO SISTEMA OTIMIZADO
const generateSystemPrompt = (
  profile: UserProfile,
  readings: GlucoseReading[],
  activeInsulin: number
) => {
  // Helpers para formatação segura de dados nulos
  const formatIC = (val?: number) => val ? `1:${val}` : "Não informado";
  const formatISF = (val?: number) => val ? `1u reduz ${val}mg/dL` : "Não informado";

  return `
ATUE COMO: GlucoGuide, assistente especialista em diabetes.
OBJETIVO: Gerenciar glicemia com segurança absoluta.

=== PERFIL (Resumo Crítico) ===
Paciente: ${profile.name} (${profile.diabetesType})
Peso: ${profile.weight}kg | Insulina: ${profile.usesInsulin ? "SIM" : "NÃO"}
Basal: ${profile.basalInsulin?.brand || "-"} | Bolus: ${profile.bolusInsulin?.brand || "-"}

=== PARÂMETROS DE CÁLCULO ===
* Ratio IC (Carboidrato por Unidade de Insulina):
  - Café: ${formatIC(profile.icRatioBreakfast)}
  - Almoço: ${formatIC(profile.icRatioLunch)}
  - Jantar: ${formatIC(profile.icRatioDinner)}
  - Lanche: ${formatIC(profile.icRatioSnack)}
* Fator Sensibilidade (ISF): ${formatISF(profile.isfMorning)}
* Metas: ${profile.targetGlucosePreMeal}-${profile.targetGlucosePostMeal} mg/dL

=== ESTADO ATUAL (DADOS DO SISTEMA) ===
1. IOB (INSULINA ATIVA RESIDUAL): ${activeInsulin.toFixed(1)} u
   IMPORTANTE: Este valor é o resto de insulina de aplicações PASSADAS (feitas há horas) que ainda está circulando no sangue. 
   NÃO É UMA APLICAÇÃO RECENTE PARA A REFEIÇÃO ATUAL.
   Use este valor apenas para reduzir a dose sugerida e evitar hipoglicemia (empilhamento).

2. ÚLTIMAS LEITURAS DE GLICEMIA:
${readings.length > 0 ? readings.slice(-5).map(r => `- ${new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}: ${r.value} (${r.type})`).join("\n") : "Sem dados recentes."}

=== REGRAS DE CONDUTA ===
1. FOTO DE COMIDA: Se receber uma foto, sua tarefa PRIMÁRIA é identificar os alimentos e ESTIMAR OS CARBOIDRATOS TOTAIS em gramas.
2. CÁLCULO: Se o usuário usa insulina, calcule a dose sugerida: (Total Carbos / Ratio IC do horário) + Correção se necessário - IOB.
3. SEGURANÇA: Sempre avise que a contagem por foto é uma estimativa.
4. CONCISÃO: Seja direto e objetivo nas explicações. Evite textos excessivamente longos que possam cortar.
5. DETECÇÃO DE GLICEMIA: Se o usuário mencionar uma medição de glicemia (ex: "medi minha glicemia deu 180", "glicemia tá em 95"), extraia o valor e o contexto.
6. SAÍDA JSON: 
   - Para REFEIÇÕES: END_JSON: {"carbs": <g>, "insulin": <u>, "calories": <kcal>}
   - Para GLICEMIA: GLUCOSE_DATA: {"value": <mg/dL>, "type": "Fasting|Pre-Meal|Post-Meal|Correction", "confidence": "high|medium|low"}
`;
};

// CHAMADA GEMINI
async function callGemini(
  promptParts: any[],
  systemInstruction: string,
): Promise<string> {
  const apiKey = Deno.env.get("API_KEY");
  if (!apiKey) throw new Error("API_KEY do Gemini não configurada.");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=" +
    apiKey;

  const body = {
    contents: [{ role: "user", parts: promptParts }],
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 4096, // Aumentado de 1000 para 4096 para evitar cortes
    },
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("Gemini Error:", JSON.stringify(data));
    throw new Error(data?.error?.message || "Erro na IA");
  }

  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
}

// HANDLER
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { number, message, media_url, media_base64, media_type } = await req.json();

    if (!number) throw new Error('Número obrigatório.');

    let cleanMediaUrl = typeof media_url === "string" ? media_url.trim() : "";
    if (cleanMediaUrl.startsWith("=")) cleanMediaUrl = cleanMediaUrl.slice(1);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const cleanInputPhone = String(number).replace(/\D/g, "");

    // 1. Identificação
    let { data: users } = await supabase.rpc("get_profile_by_phone", { phone_number: cleanInputPhone });

    if (!users || users.length === 0) {
      const { data: allUsers } = await supabase.from("profiles").select("*");
      if (allUsers) {
        users = allUsers.filter((u: any) => {
          const dbPhone = (u.medical_data?.phone || "").replace(/\D/g, "");
          return dbPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(dbPhone);
        });
      }
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({
        number: cleanInputPhone,
        reply_type: "text",
        reply_content: "Olá! Não encontrei seu cadastro. Por favor, cadastre-se no app web."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const user = users[0];
    const profile = user.medical_data as UserProfile;
    const userId = user.id;

    // 2. Busca de Dados

    // Glicemia
    const { data: readings } = await supabase
      .from("glucose_readings")
      .select("value, timestamp, type")
      .eq("user_id", userId)
      .order("timestamp", { ascending: true })
      .limit(10);

    // Insulina
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: insulinHistory } = await supabase
      .from("insulin_history")
      .select("created_at, units, insulin_type")
      .eq("user_id", userId)
      .gte("created_at", sixHoursAgo);

    // IOB Calculation
    let activeInsulin = 0;
    const insulinDuration = profile.insulinDuration || 4;
    const now = new Date();

    if (insulinHistory) {
      insulinHistory.forEach((record: any) => {
        if (record.insulin_type === 'Bolus' || record.insulin_type === 'Correção') {
          const diffHours = (now.getTime() - new Date(record.created_at).getTime()) / 36e5;
          if (diffHours >= 0 && diffHours < insulinDuration) {
            activeInsulin += Number(record.units) * (1 - (diffHours / insulinDuration));
          }
        }
      });
    }

    // --- CORREÇÃO DE MEMÓRIA (HISTÓRICO) ---
    const { data: historyData } = await supabase
      .from("chat_history")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatHistoryRaw = (historyData || []).reverse();

    const chatHistory = chatHistoryRaw
      .filter((m: any) => m.content && m.content.trim().length > 0)
      .map((m: any) => {
        const timeStr = new Date(m.created_at).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
        });
        return {
          role: m.role,
          parts: [{ text: `[${timeStr}] ${m.content}` }],
        };
      });

    // 3. Processamento de Mídia
    const promptParts: any[] = [];
    let mimeType = "";
    let base64Data = "";
    let mediaProcessed = false;

    if (media_base64) {
      base64Data = String(media_base64).replace(/^data:.*,/, "");
      mimeType = media_type === "audio" ? "audio/ogg" : "image/jpeg";
      mediaProcessed = true;
    } else if (cleanMediaUrl && !cleanMediaUrl.includes("whatsapp.net")) {
      try {
        const mediaRes = await fetch(cleanMediaUrl);
        if (mediaRes.ok) {
          const blob = await mediaRes.blob();
          const buff = await blob.arrayBuffer();
          base64Data = btoa(String.fromCharCode(...new Uint8Array(buff)));
          mimeType = blob.type || "image/jpeg";
          mediaProcessed = true;
        }
      } catch (e) {
        console.error("Erro download media:", e);
      }
    }

    if (mediaProcessed && base64Data) {
      promptParts.push({ inlineData: { mimeType, data: base64Data } });

      if (mimeType.startsWith("image")) {
        promptParts.push({ text: message ? `[FOTO] Contexto: ${message}. Identifique os alimentos, estime carboidratos e sugira insulina.` : `[FOTO DA REFEIÇÃO] Identifique os alimentos, estime os carboidratos totais e verifique se preciso de insulina.` });
      } else if (mimeType.startsWith("audio")) {
        promptParts.push({ text: message ? `[ÁUDIO] Contexto: ${message}` : `[ÁUDIO DO USUÁRIO] Transcreva e responda.` });
      }
    } else {
      promptParts.push({ text: message || "Oi" });
    }

    // 4. Geração e Chamada
    const systemInstruction = generateSystemPrompt(profile, (readings || []) as any[], activeInsulin);

    const fullPromptParts: any[] = [];
    chatHistory.forEach(h => fullPromptParts.push({ text: `[${h.role}] ${h.parts[0].text}` }));
    promptParts.forEach(p => fullPromptParts.push(p));

    const rawReplyText = await callGemini(fullPromptParts, systemInstruction);

    // 5. Pós-processamento
    let replyText = rawReplyText;
    let parsedData: any = {};
    let extractedGlucose: ExtractedGlucoseData | null = null;

    // Extract meal data
    const jsonMatch = rawReplyText.match(/END_JSON:\s*({.*})/s);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedData = JSON.parse(jsonMatch[1]);
        replyText = rawReplyText.replace(jsonMatch[0], '').trim();
      } catch { }
    }

    // Extract glucose data from AI response
    const glucoseMatch = rawReplyText.match(/GLUCOSE_DATA:\s*({.*?})/s);
    if (glucoseMatch && glucoseMatch[1]) {
      try {
        const glucoseData = JSON.parse(glucoseMatch[1]);
        if (glucoseData.value && glucoseData.value >= 40 && glucoseData.value <= 600) {
          extractedGlucose = {
            value: glucoseData.value,
            type: glucoseData.type || 'Correction',
            timestamp: new Date().toISOString(),
            confidence: glucoseData.confidence || 'high'
          };
        }
        replyText = rawReplyText.replace(glucoseMatch[0], '').trim();
      } catch { }
    }

    // Fallback: Try regex extraction if AI didn't detect glucose
    if (!extractedGlucose && message) {
      extractedGlucose = extractGlucoseFromText(message, new Date());
    }

    // Add confirmation to reply if glucose was detected
    if (extractedGlucose && (extractedGlucose.confidence === 'high' || extractedGlucose.confidence === 'medium')) {
      const timeStr = new Date(extractedGlucose.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const contextMap: Record<string, string> = {
        'Fasting': 'em jejum',
        'Pre-Meal': 'pré-refeição',
        'Post-Meal': 'pós-refeição',
        'Correction': 'para correção'
      };
      const confirmMsg = `\n\n✅ Glicemia de ${extractedGlucose.value} mg/dL registrada às ${timeStr} (${contextMap[extractedGlucose.type]}).`;
      replyText = replyText + confirmMsg;
    }

    // 6. Salvamento
    const savePromises: Promise<any>[] = [
      supabase.from("chat_history").insert([
        { user_id: userId, role: "user", content: message || (mediaProcessed ? `[Mídia: ${mimeType}]` : "Oi"), is_audio: mimeType.startsWith("audio"), is_image: mimeType.startsWith("image") },
        { user_id: userId, role: "model", content: replyText }
      ])
    ];

    // Save meal data if detected
    if (mediaProcessed && mimeType.startsWith("image") && parsedData.carbs) {
      savePromises.push(
        supabase.from("meal_history").insert({
          user_id: userId,
          description: message || "Refeição via WhatsApp",
          estimated_carbs: parsedData.carbs,
          estimated_calories: parsedData.calories,
          insulin_suggested: parsedData.insulin,
          assistant_comment: replyText,
          favorite: false
        })
      );
    }

    // Save glucose reading if detected with sufficient confidence
    if (extractedGlucose && (extractedGlucose.confidence === 'high' || extractedGlucose.confidence === 'medium')) {
      savePromises.push(
        supabase.from("glucose_readings").insert({
          user_id: userId,
          value: extractedGlucose.value,
          type: extractedGlucose.type,
          timestamp: extractedGlucose.timestamp
        })
      );
    }

    Promise.all(savePromises).catch(err => console.error("Erro ao salvar histórico:", err));

    return new Response(JSON.stringify({
      number: cleanInputPhone,
      reply_type: "text",
      reply_content: replyText,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Erro Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});