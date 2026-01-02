import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GEMINI_TOOLS, getPeriodFilter, getTableName } from './gemini-tools.ts';
import { processFunctionCalls } from './function-handlers.ts';
import { findUserProfile, UserProfile } from './services/profileService.ts';
import { processGlucoseRegex, extractGlucoseFromText } from './services/glucoseService.ts';
import { processMediaInput } from './services/mediaService.ts';
import { checkGatekeeper, detectMessageType } from './services/gatekeeperService.ts';
import { createCheckoutSession } from './services/paymentService.ts';

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

// Interface UserProfile agora importada de profileService.ts

interface GlucoseReading {
  value: number;
  timestamp: string;
  type: string;
}

// extractGlucoseFromText agora importado de glucoseService.ts


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
  activeInsulin: number,
  basalLogs: any[] = [] // Novos logs de basal
) => {
  // Helpers para formatação segura de dados nulos
  const formatIC = (val?: number) => val ? `1:${val}` : "Não informado";
  const formatISF = (val?: number) => val ? `1u reduz ${val}mg/dL` : "Não informado";

  // Formatar Basal Prescrita
  let basalInfo = "Não usa";
  if (profile.usesInsulin && profile.basalInsulin?.brand) {
    const b = profile.basalInsulin;
    basalInfo = `${b.brand}`;
    if (b.morningDose) basalInfo += ` | Manhã: ${b.morningDose}u (${b.morningTime || 'N/A'})`;
    if (b.nightDose) basalInfo += ` | Noite: ${b.nightDose}u (${b.nightTime || 'N/A'})`;
  }

  // Verificar Status Basal Hoje
  const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const basalTaken = basalLogs.filter(l => {
    const logDate = new Date(l.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return logDate === today;
  });

  const basalStatus = basalTaken.length > 0
    ? `✅ TOMADA HOJE (${basalTaken.map(l => `${l.units}u às ${new Date(l.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`).join(', ')})`
    : "⚠️ NÃO REGISTRADA HOJE";

  return `
ATUE COMO: GlucoGuide, assistente especialista em diabetes.
OBJETIVO: Gerenciar glicemia com segurança absoluta.

=== PERFIL (Resumo Crítico) ===
Paciente: ${profile.name} (${profile.diabetesType})
Peso: ${profile.weight}kg | Insulina Ativa (IOB): ${activeInsulin.toFixed(1)}u
Insulina: ${profile.usesInsulin ? "SIM" : "NÃO"}
Basal (Lenta): ${basalInfo}
STATUS BASAL HOJE: ${basalStatus}
Bolus (Rápida): ${profile.bolusInsulin?.brand || "-"}

=== PARÂMETROS DE CÁLCULO ===
* Ratio IC (Carboidrato por Unidade de Insulina):
  - Café: ${formatIC(profile.icRatioBreakfast)}
  - Almoço: ${formatIC(profile.icRatioLunch)}
  - Jantar: ${formatIC(profile.icRatioDinner)}
  - Lanche: ${formatIC(profile.icRatioSnack)}
* Fator Sensibilidade (ISF): ${formatISF(profile.isfMorning)}
* Metas: ${profile.targetGlucosePreMeal}-${profile.targetGlucosePostMeal} mg/dL

=== ⚠️ PRECISÃO DE INSULINA (OS-09 - CRÍTICO) ===
* Método de Aplicação: ${profile.insulinMethod || 'Caneta'}
* Precisão da Dose: ${profile.insulinStep || 1.0}u

🔴 REGRAS DE ARREDONDAMENTO (SEGURANÇA MÉDICA):
${profile.insulinStep === 0.5 ? `
✅ PRECISÃO 0.5u (Pediátrico/Sensível):
   - Arredonde SEMPRE para o múltiplo de 0.5u mais próximo
   - Exemplos: 3.2u → 3.0u | 3.3u → 3.5u | 3.7u → 3.5u | 3.8u → 4.0u
   - Fórmula: Math.round(dose * 2) / 2
   - NUNCA sugira doses como 3.2u, 3.4u, 3.6u, 3.8u
` : `
✅ PRECISÃO 1.0u (Padrão):
   - Arredonde SEMPRE para o inteiro mais próximo
   - Exemplos: 3.2u → 3u | 3.4u → 3u | 3.5u → 4u | 3.6u → 4u
   - Fórmula: Math.round(dose)
   - NUNCA sugira doses decimais (3.5u, 3.2u, etc)
`}
📝 FORMATO DA RESPOSTA:
   Quando calcular uma dose, SEMPRE explique o arredondamento:
   
   "Cálculo: [X]g de carboidratos ÷ [ratio] = [dose_calculada]u
   
   ⚙️ Ajuste para sua ${profile.insulinMethod || 'caneta'} (precisão ${profile.insulinStep || 1.0}u):
   Dose sugerida: [dose_arredondada]u"
   
   Exemplo real:
   "Cálculo: 54g ÷ 10 = 5.4u
   
   ⚙️ Ajuste para sua caneta (precisão 1.0u):
   Dose sugerida: 5u (arredondado de 5.4u)"

=== ESTADO ATUAL (DADOS DO SISTEMA) ===
ÚLTIMAS LEITURAS DE GLICEMIA:
${readings.length > 0 ? readings.slice(0, 5).map(r => `- ${new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}: ${r.value} (${r.type})`).join("\n") : "Sem dados recentes."}

=== REGRAS DE CONDUTA ===
1. IOB (INSULINA ATIVA): Sempre use o valor exato do PERFIL acima. Não calcule manualmente baseado em doses aplicadas.
2. BASAL: Se o usuário perguntar se tomou a basal, consulte o STATUS BASAL HOJE acima. Se não tomou e já passou do horário (ver Perfil), lembre-o gentilmente.
3. FOTO DE COMIDA/ÁUDIO: Se receber uma foto ou áudio descrevendo comida, sua tarefa PRIMÁRIA é identificar os alimentos e ESTIMAR OS CARBOIDRATOS TOTAIS em gramas.
4. CÁLCULO: Se o usuário usa insulina, calcule a dose sugerida: (Total Carbos / Ratio IC do horário) + Correção se necessário - IOB.
5. 🔴 ARREDONDAMENTO: SEMPRE arredonde a dose final conforme as REGRAS DE ARREDONDAMENTO acima. NUNCA sugira doses que o paciente não consegue aplicar.
6. SEGURANÇA: Sempre avise que a contagem por foto é uma estimativa.
7. CONCISÃO: Seja direto e objetivo nas explicações. Evite textos excessivamente longos que possam cortar.
8. REGISTRO DE DADOS: OBRIGATÓRIO usar as ferramentas (Function Calling) 'registrar_evento' para salvar refeições, insulinas ou glicemias que NÃO foram capturadas automaticamente.
   - NÃO tente gerar JSON no texto (como GLUCOSE_DATA). ISSO É PROIBIDO.
   - Use APENAS a ferramenta 'registrar_evento'.
`;
};

// ... (rest of the file)


// CHAMADA GEMINI COM FUNCTION CALLING
// ⚠️ FASE 3: Suporta Function Calling com depth limit para evitar loops infinitos
async function callGemini(
  promptParts: any[],
  systemInstruction: string,
  userId?: string,
  supabase?: any,
  depth: number = 0,
  profile?: UserProfile
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
      getTableName,
      profile
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
    return await callGemini(newPromptParts, systemInstruction, userId, supabase, depth + 1, profile);
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
    // ============================================
    // 📡 NORMALIZAÇÃO DE PAYLOAD (POLIGLOTA)
    // ============================================
    // Suporta múltiplos formatos de webhook:
    // - Evolution API: { from, message, ... }
    // - n8n: { from, message, ... }
    // - Postman/Custom: { number, message, ... }

    const body = await req.json();

    // Normalizar número do telefone (aceita 'from', 'number' ou 'phone')
    const from = body.from || body.number || body.phone;

    // Extrair outros campos
    const {
      message,
      media_url,
      media_base64,
      mime_type
    } = body;

    if (!from) {
      throw new Error('Número do telefone obrigatório (from, number ou phone).');
    }

    let cleanMediaUrl = typeof media_url === "string" ? media_url.trim() : "";
    if (cleanMediaUrl.startsWith("=")) cleanMediaUrl = cleanMediaUrl.slice(1);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const cleanInputPhone = String(from).replace(/\D/g, "");

    // 1. Identificação do Usuário (usando profileService)
    const userResult = await findUserProfile(supabase, cleanInputPhone);

    if (!userResult) {
      return new Response(JSON.stringify({
        number: cleanInputPhone,
        reply_type: "text",
        reply_content: "Olá! Não encontrei seu cadastro. Por favor, cadastre-se no app web."
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { id: userId, profile } = userResult;

    // ============================================
    // 🔒 OS-11: GATEKEEPER (INTERCEPTOR DE ACESSO)
    // ============================================
    // Detectar tipo de mensagem (text, image, audio)
    const messageType = detectMessageType(body);
    console.log(`[Gatekeeper] Tipo de mensagem detectado: ${messageType}`);

    // Verificar se usuário pode enviar mensagem
    const gatekeeperResult = await checkGatekeeper(profile, messageType, supabase);

    // ============================================
    // 🔒 OS-11/12: GATEKEEPER & PAGAMENTO
    // ============================================
    if (!gatekeeperResult.allowed) {
      console.log(`[Gatekeeper] Acesso bloqueado: ${gatekeeperResult.reason}`);

      // ============================================================================
      // 1. GERAR LINK DE PAGAMENTO DINÂMICO (OS-12)
      // ============================================================================

      let paymentLink = "https://glucoai.com/premium"; // Fallback

      try {
        const priceId = Deno.env.get("STRIPE_PRICE_ID");

        if (priceId) {
          console.log('[Payment] Gerando link de checkout...');
          const sessionUrl = await createCheckoutSession(
            supabase,
            userId,
            cleanInputPhone,
            priceId
          );

          if (sessionUrl) {
            paymentLink = sessionUrl;
            console.log('[Payment] Link gerado com sucesso');
          }
        } else {
          console.warn('[Payment] ⚠️ STRIPE_PRICE_ID não configurado nos Secrets!');
        }
      } catch (err) {
        console.error('[Payment] Erro ao gerar link:', err);
      }

      // ============================================================================
      // 2. MONTAR MENSAGEM FINAL COM LINK
      // ============================================================================

      const finalMessage = `${gatekeeperResult.message}\n\n💳 *Assine Agora e Libere na Hora:*\n${paymentLink}`;

      // ============================================================================
      // 3. ENVIAR VIA WEBHOOK (n8n/Evolution)
      // ============================================================================

      const webhookUrl = Deno.env.get("N8N_OUTBOUND_WEBHOOK_URL");
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: from,
              text: finalMessage
            })
          });
          console.log('[Gatekeeper] Mensagem de bloqueio enviada com link de pagamento');
        } catch (err) {
          console.error('[Gatekeeper] Erro ao enviar webhook:', err);
        }
      }

      // ============================================================================
      // 4. RETORNAR (Early Return)
      // ============================================================================

      return new Response(JSON.stringify({
        success: true,
        action: 'blocked',
        reason: gatekeeperResult.reason,
        message: finalMessage,
        payment_link: paymentLink
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[Gatekeeper] ✅ Acesso liberado (${profile.subscription_status || 'trial'})`);


    // ============================================
    // 🚀 REGEX-FIRST ARCHITECTURE (INTERCEPTOR)
    // ============================================
    // Apenas se NÃO for mídia. Mídia exige IA para visão/áudio.
    const isMedia = media_base64 || (cleanMediaUrl && !cleanMediaUrl.includes("whatsapp.net"));
    let extractedGlucoseViaRegex = null;

    if (!isMedia && message) {
      // Processar glicemia via glucoseService
      extractedGlucoseViaRegex = await processGlucoseRegex(supabase, userId, message);
    }

    // Se o Regex capturou e salvou, apenas pedir feedback simples para a IA e RETORNAR
    if (extractedGlucoseViaRegex) {
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const promptFeedback = `O usuário registrou uma glicemia de ${extractedGlucoseViaRegex.value} mg/dL (${extractedGlucoseViaRegex.type}) às ${timeStr}. O dado JÁ FOI SALVO no banco de dados com sucesso. Sua tarefa é APENAS dar um feedback curto, encorajador e confirmar o registro. NÃO tente salvar dnv.`;

      // Chamada Text-Only (Sem tools, rápido)
      const feedback = await callGeminiTextOnly([{ text: promptFeedback }], generateSystemPrompt(profile, [], 0, []));

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

    // 🚨 VERIFICAÇÃO ADICIONAL: Evitar processar mídia duplicada
    // Se houver imagem + texto com glicemia, verificar se já foi registrado
    if (isMedia && message) {
      const match = extractGlucoseFromText(message);

      if (match) {
        console.log(`[Media] Texto acompanha imagem: ${match.value} mg/dL`);

        // Verificar se já foi processado recentemente (mesma proteção do Regex-First)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: existingReadings } = await supabase
          .from('glucose_readings')
          .select('id')
          .eq('user_id', userId)
          .eq('value', match.value)
          .gte('timestamp', tenMinutesAgo)
          .limit(1);

        if (existingReadings && existingReadings.length > 0) {
          console.log('[Media] Glicemia já registrada recentemente. Ignorando retry de webhook com imagem.');

          // Retornar resposta padrão sem processar IA
          return new Response(JSON.stringify({
            number: cleanInputPhone,
            reply_type: "text",
            reply_content: "Registro já processado anteriormente. ✅"
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    // 2. Busca de Dados para Contexto

    // Glicemia - CORRIGIDO: Buscar os 10 MAIS RECENTES (não os mais antigos)
    const { data: readings } = await supabase
      .from("glucose_readings")
      .select("value, timestamp, type")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false }) // DESCENDENTE = mais recentes primeiro
      .limit(10);

    // IOB Calculation
    const { data: iobData, error: iobError } = await supabase.rpc('calculate_active_insulin', {
      p_user_id: userId,
      p_dia: profile.insulinDuration || 4
    });

    const activeInsulin = iobError ? 0 : (iobData || 0);

    // 🔍 DEBUG: Log IOB calculation
    console.log('=== IOB DEBUG ===');
    console.log('Active Insulin:', activeInsulin);

    // BASAL HISTORY CHECK (NOVO)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Ajuste fuso horário simples (UTC vs Local - considerando servidor UTC)
    // Na verdade, created_at é UTC. Então pegamos as últimas 24h ou convertemos range.
    // Simplificando: pegamos logs das últimas 24h e filtramos no JS com timezone BR.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentInsulinLogs } = await supabase
      .from("insulin_history")
      .select("units, insulin_type, created_at")
      .eq("user_id", userId)
      .eq("insulin_type", "Basal") // Postgres Case Sensitive? Enum geralmente é Capitalized no DB
      .gte("created_at", oneDayAgo);

    const basalLogs = recentInsulinLogs || [];
    console.log(`[Context] Basal logs last 24h: ${basalLogs.length}`);
    console.log('================');

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

    // 3. TRATAMENTO DE MÍDIA (Delegado ao Service)
    const processedMedia = await processMediaInput(media_base64, media_url, mime_type);

    const promptParts: any[] = [];

    if (processedMedia) {
      // Injeção limpa de mídia
      promptParts.push({
        inlineData: {
          mimeType: processedMedia.mimeType,
          data: processedMedia.data
        }
      });

      // Contexto para a IA
      if (processedMedia.mimeType.startsWith("image")) {
        promptParts.push({
          text: message
            ? `[FOTO] Contexto: ${message}. Identifique os alimentos, estime carboidratos e sugira insulina.`
            : `[FOTO DA REFEIÇÃO] Identifique os alimentos, estime os carboidratos totais e verifique se preciso de insulina.`
        });
      } else if (processedMedia.mimeType.startsWith("audio")) {
        promptParts.push({
          text: message
            ? `[ÁUDIO] Contexto: ${message}`
            : `[ÁUDIO DO USUÁRIO] Transcreva e responda.`
        });
      }
    } else {
      promptParts.push({ text: message || "Oi" });
    }

    // 4. Geração e Chamada
    // 4. Geração e Chamada
    const systemInstruction = generateSystemPrompt(profile, (readings || []) as any[], activeInsulin, basalLogs);

    const fullPromptParts: any[] = [];
    chatHistory.forEach(h => fullPromptParts.push({ text: `[${h.role}] ${h.parts[0].text}` }));
    promptParts.forEach(p => fullPromptParts.push(p));

    // ✅ FASE 3: Chamada com Tools (Function Calling)
    const replyText = await callGemini(fullPromptParts, systemInstruction, userId, supabase, 0, profile);

    // 6. Salvamento (CORRIGIDO)
    // Mantemos APENAS o histórico do chat. 
    // Os dados médicos (glicemia, refeição, insulina) JÁ FORAM SALVOS pela Tool (handleRegistrarEvento).

    const savePromises: Promise<any>[] = [
      supabase.from("chat_history").insert([
        {
          user_id: userId,
          role: "user",
          content: message || (processedMedia ? `[Mídia: ${processedMedia.mimeType}]` : "Oi"),
          is_audio: processedMedia?.mimeType.startsWith("audio") || false,
          is_image: processedMedia?.mimeType.startsWith("image") || false
        },
        {
          user_id: userId,
          role: "model",
          content: replyText
        }
      ])
    ];

    // ❌ BLOCO REMOVIDO: Insert de meal_history (Causava duplicidade)
    // ❌ BLOCO REMOVIDO: Insert de glucose_readings (Causava duplicidade)
    // ❌ BLOCO REMOVIDO: Insert de insulin_history (Causava duplicidade)

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