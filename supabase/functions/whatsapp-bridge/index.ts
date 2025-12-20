import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GEMINI_TOOLS, getPeriodFilter, getTableName } from './gemini-tools.ts';
import { processFunctionCalls } from './function-handlers.ts';

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

// UTILITY FUNCTIONS FOR GLUCOSE EXTRACTION
function extractGlucoseFromText(message: string): { value: number; type: string } | null {
  if (!message) return null;

  // REGEX ROBUSTO (Regex-First Architecture)
  // Aceita: "Glicemia 103", "Glicemia de 103", "Glicemia atual 103", "Glicemia está em 103"
  const glucosePattern = /(?:glicemia|glicose|glucose|gli|açúcar)\s*(?:atual|agora|hoje|do momento)?\s*(?:está?|tá|é|foi|deu|marcou|mediu?)?\s*(?:em|de|a|:)?\s*(\d{2,3})/i;

  const match = message.match(glucosePattern);
  if (match && match[1]) {
    const value = parseInt(match[1]);

    // Validate range (20-600 mg/dL)
    if (value < 20 || value > 600) return null;

    // Infer context based on time (Simplified for immediate capture)
    const hour = new Date().getHours();
    let type = 'Correction';
    if (hour >= 6 && hour < 9) type = 'Fasting';
    else if (hour >= 11 && hour < 13) type = 'Pre-Meal';
    else if (hour >= 13 && hour < 15) type = 'Post-Meal';
    else if (hour >= 18 && hour < 20) type = 'Pre-Meal';
    else if (hour >= 20 && hour < 22) type = 'Post-Meal';

    return { value, type };
  }

  return null;
}

function inferMealTime(timestamp: Date): string {
  const hour = timestamp.getHours();

  if (hour >= 6 && hour < 10) return 'Café';
  if (hour >= 10 && hour < 12) return 'Lanche da Manhã';
  if (hour >= 12 && hour < 15) return 'Almoço';
  if (hour >= 15 && hour < 18) return 'Lanche da Tarde';
  if (hour >= 18 && hour < 21) return 'Jantar';
  return 'Ceia';
}

// PROMPT DO SISTEMA OTIMIZADO (CLEAN - SEM INSTRUÇÕES DE JSON TEXTO)
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
1. FOTO DE COMIDA/ÁUDIO: Se receber uma foto ou áudio descrevendo comida, sua tarefa PRIMÁRIA é identificar os alimentos e ESTIMAR OS CARBOIDRATOS TOTAIS em gramas.
2. CÁLCULO: Se o usuário usa insulina, calcule a dose sugerida: (Total Carbos / Ratio IC do horário) + Correção se necessário - IOB.
3. SEGURANÇA: Sempre avise que a contagem por foto é uma estimativa.
4. CONCISÃO: Seja direto e objetivo nas explicações. Evite textos excessivamente longos que possam cortar.
5. REGISTRO DE DADOS: OBRIGATÓRIO usar as ferramentas (Function Calling) 'registrar_evento' para salvar refeições, insulinas ou glicemias que NÃO foram capturadas automaticamente.
   - NÃO tente gerar JSON no texto (como GLUCOSE_DATA). ISSO É PROIBIDO.
   - Use APENAS a ferramenta 'registrar_evento'.
`;
};

// CHAMADA GEMINI COM FUNCTION CALLING
// ⚠️ FASE 3: Suporta Function Calling com depth limit para evitar loops infinitos
async function callGemini(
  promptParts: any[],
  systemInstruction: string,
  userId?: string,
  supabase?: any,
  depth: number = 0
): Promise<string> {
  const apiKey = Deno.env.get("API_KEY");
  if (!apiKey) throw new Error("API_KEY do Gemini não configurada.");

  // ⚠️ SAFETY LOOP: Limite de profundidade para evitar loops infinitos
  const MAX_DEPTH = 3;
  if (depth >= MAX_DEPTH) {
    console.warn(`[Function Call] Depth limit reached (${depth}). Returning text response.`);
    // Forçar resposta de texto sem tools
    return await callGeminiTextOnly(promptParts, systemInstruction);
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" +
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
      maxOutputTokens: 4096,
    },
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
    // ✅ FASE 3: Adicionar tools se userId e supabase estiverem disponíveis
    ...(userId && supabase ? { tools: [{ functionDeclarations: GEMINI_TOOLS }] } : {})
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

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    throw new Error("Nenhuma resposta da IA");
  }

  const parts = candidate.content?.parts || [];

  // ✅ FASE 3: CORREÇÃO CRÍTICA 3 - Verificar se há function calls (parallel calls support)
  const hasFunctionCalls = parts.some((p: any) => p.functionCall);

  if (hasFunctionCalls && userId && supabase) {
    console.log(`[Function Call] IA solicitou ${parts.filter((p: any) => p.functionCall).length} chamada(s) de função (depth: ${depth})`);

    // Processar todas as function calls
    const functionResults = await processFunctionCalls(
      parts,
      userId,
      supabase,
      inferMealTime,
      getPeriodFilter,
      getTableName
    );

    // Construir resposta com os resultados das funções
    const functionResponseParts = functionResults.map((result, index) => ({
      functionResponse: {
        name: parts.filter((p: any) => p.functionCall)[index]?.functionCall?.name || 'unknown',
        response: result
      }
    }));

    // Segunda chamada à IA com os resultados das funções
    const newPromptParts = [
      ...promptParts,
      ...functionResponseParts
    ];

    // Recursão com depth incrementado
    return await callGemini(newPromptParts, systemInstruction, userId, supabase, depth + 1);
  }

  // Se não houver function calls, retornar texto normal
  return parts.map((p: any) => p.text || "").join("") || "";
}

// Função auxiliar para forçar resposta de texto (sem tools)
async function callGeminiTextOnly(
  promptParts: any[],
  systemInstruction: string
): Promise<string> {
  const apiKey = Deno.env.get("API_KEY");
  if (!apiKey) throw new Error("API_KEY do Gemini não configurada.");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" +
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
      maxOutputTokens: 4096,
    },
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
    // SEM tools
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

    // ============================================
    // 🚀 REGEX-FIRST ARCHITECTURE (INTERCEPTOR)
    // ============================================
    // Apenas se NÃO for mídia. Mídia exige IA para visão/áudio.
    const isMedia = media_base64 || (cleanMediaUrl && !cleanMediaUrl.includes("whatsapp.net"));
    let extractedGlucoseViaRegex = null;

    if (!isMedia && message) {
      // Tentar interceptar com regex robusto
      const match = extractGlucoseFromText(message);

      if (match) {
        console.log(`[Regex] Capturada glicemia: ${match.value} ${match.type}`);

        // A. Salvar IMEDIATAMENTE no Banco
        const { error: saveError } = await supabase
          .from('glucose_readings')
          .insert({
            user_id: userId,
            value: match.value,
            type: match.type,
            timestamp: new Date().toISOString()
          });

        if (!saveError) {
          extractedGlucoseViaRegex = match; // Flag de sucesso
        } else {
          console.error('[Regex] Erro ao salvar:', saveError);
        }
      }
    }

    // Se o Regex capturou e salvou, apenas pedir feedback simples para a IA e RETORNAR
    if (extractedGlucoseViaRegex) {
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const promptFeedback = `O usuário registrou uma glicemia de ${extractedGlucoseViaRegex.value} mg/dL (${extractedGlucoseViaRegex.type}) às ${timeStr}. O dado JÁ FOI SALVO no banco de dados com sucesso. Sua tarefa é APENAS dar um feedback curto, encorajador e confirmar o registro. NÃO tente salvar dnv.`;

      // Chamada Text-Only (Sem tools, rápido)
      const feedback = await callGeminiTextOnly([{ text: promptFeedback }], generateSystemPrompt(profile, [], 0));

      // Retornar Resposta Imediata
      return new Response(JSON.stringify({
        number: cleanInputPhone,
        reply_type: "text",
        reply_content: feedback,
        action_data: {
          events: [{
            type: 'glucose_reading',
            value: extractedGlucoseViaRegex.value,
            glucose_type: extractedGlucoseViaRegex.type,
            confidence: 'high' // Regex é certeza
          }]
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================
    // ⬇️ FLUXO NORMAL IA (FALLBACK / MÍDIA)
    // ============================================

    // 2. Busca de Dados para Contexto

    // Glicemia
    const { data: readings } = await supabase
      .from("glucose_readings")
      .select("value, timestamp, type")
      .eq("user_id", userId)
      .order("timestamp", { ascending: true })
      .limit(10);

    // IOB Calculation
    const { data: iobData, error: iobError } = await supabase.rpc('calculate_active_insulin', {
      p_user_id: userId,
      p_dia: profile.insulinDuration || 4
    });

    const activeInsulin = iobError ? 0 : (iobData || 0);

    // Histórico de Chat
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

    // 3. Processamento de Mídia e Prompt
    const promptParts: any[] = [];
    let mimeType = "";
    let base64Data = "";

    if (media_base64) {
      base64Data = String(media_base64).replace(/^data:.*,/, "");
      mimeType = media_type === "audio" ? "audio/ogg" : "image/jpeg";
    } else if (cleanMediaUrl && !cleanMediaUrl.includes("whatsapp.net")) {
      try {
        const mediaRes = await fetch(cleanMediaUrl);
        if (mediaRes.ok) {
          const blob = await mediaRes.blob();
          const buff = await blob.arrayBuffer();
          base64Data = btoa(String.fromCharCode(...new Uint8Array(buff)));
          mimeType = blob.type || "image/jpeg";
        }
      } catch (e) {
        console.error("Erro download media:", e);
      }
    }

    if (base64Data) {
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

    // ✅ FASE 3: Chamada com Tools (Function Calling)
    const replyText = await callGemini(fullPromptParts, systemInstruction, userId, supabase);

    // 6. Salvamento do Chat
    const savePromises: Promise<any>[] = [
      supabase.from("chat_history").insert([
        { user_id: userId, role: "user", content: message || (base64Data ? `[Mídia: ${mimeType}]` : "Oi"), is_audio: mimeType?.startsWith("audio"), is_image: mimeType?.startsWith("image") },
        { user_id: userId, role: "model", content: replyText }
      ])
    ];

    Promise.all(savePromises).catch(err => console.error("Erro ao salvar histórico:", err));

    return new Response(JSON.stringify({
      number: cleanInputPhone,
      reply_type: "text",
      reply_content: replyText,
      action_data: null // Function Calling já tratou os eventos e o regex tratou os textos simples
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Erro Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});