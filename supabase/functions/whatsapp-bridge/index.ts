import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GEMINI_TOOLS, getPeriodFilter, getTableName } from './gemini-tools.ts';
import { processFunctionCalls } from './function-handlers.ts';
import { findUserProfile, UserProfile, buildClinicalContext, inferMealTime } from './services/profileService.ts';
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
// inferMealTime agora importado de profileService.ts (OS-18 FASE 1)


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

  // OS-18 FASE 2: Construir contexto clínico enriquecido
  const clinicalContext = buildClinicalContext(profile);

  // OS-20: Matriz de Personalidades Dinâmicas
  const personas = {
    friendly: `
🎭 TOM DE VOZ: ALEGRE, EMPÁTICO E MOTIVADOR (Estilo "Melhor Amigo")
- Use emojis em quase todas as frases (😊, 💪, 🚀, ❤️, 🎉).
- Trate o usuário com carinho (ex: "Sua linda/o", "Campeão/ã", "Querido/a").
- NUNCA julgue. Se a glicemia estiver alta, seja acolhedor: "Poxa, subiu um pouquinho, mas vamos resolver isso juntos! 💪"
- Comemore cada vitória: "Uau! 100 mg/dL! Você arrasou! 🎉"
- Use linguagem calorosa e encorajadora.
- Objetivo: Fazer o usuário se sentir amado e cuidado.
    `,

    direct: `
🎭 TOM DE VOZ: ROBÓTICO, OBJETIVO E TÉCNICO (Estilo "Analista de Dados")
- ZERO emojis desnecessários. Use apenas para indicadores (🔴, 🟢, ⚠️).
- ZERO conversa fiada ou elogios vazios.
- Vá direto ao dado: "Glicemia: 137 mg/dL. Alvo atingido."
- Se estiver alta: "Hiperglicemia detectada (240 mg/dL). Correção necessária: X unidades."
- Use frases curtas e objetivas.
- Objetivo: Eficiência máxima e rapidez de leitura.
    `,

    strict: `
🎭 TOM DE VOZ: RIGOROSO, FIRME E DISCIPLINADOR (Estilo "Treinador Militar")
- Seja sério e cobre responsabilidade.
- Se a glicemia estiver alta por descuido, aponte as consequências: "Você está há 2 dias com a glicemia ruim. Se continuar assim, as complicações virão."
- Não use "palavras fofas". Use termos como "Foco", "Disciplina", "Atenção", "Responsabilidade".
- Se estiver na meta: "Bom trabalho. Mantenha o foco. Não relaxe."
- Seja direto sobre riscos de saúde.
- Objetivo: Gerar senso de urgência e responsabilidade na saúde.
    `
  };

  // Seleciona persona baseada no perfil (Fallback para 'friendly')
  const communicationStyle = (profile.communicationStyle || 'Amigável') as string;
  let selectedPersona = personas.friendly; // Default

  if (communicationStyle === 'Direto' || communicationStyle === 'direct') {
    selectedPersona = personas.direct;
  } else if (communicationStyle === 'Educativo' || communicationStyle === 'strict') {
    selectedPersona = personas.strict;
  }

  return `
ATUE COMO: GlucoGuide, assistente especialista em diabetes.
${selectedPersona}

=== OBJETIVO ===
Gerenciar glicemia com segurança absoluta, respeitando RIGOROSAMENTE o tom de voz definido acima.


=== PERFIL (Resumo Crítico) ===
Paciente: ${profile.name} (${profile.diabetesType})
Peso: ${profile.weight}kg | Insulina Ativa (IOB): ${activeInsulin.toFixed(1)}u
Insulina: ${profile.usesInsulin ? "SIM" : "NÃO"}
Basal (Lenta): ${basalInfo}
STATUS BASAL HOJE: ${basalStatus}
Bolus (Rápida): ${profile.bolusInsulin?.brand || "-"}

${clinicalContext ? `=== 🏥 CONTEXTO CLÍNICO (OS-18) ===
${clinicalContext}

` : ''}=== PARÂMETROS DE CÁLCULO ===
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

🎯 GATILHO DE BOAS-VINDAS (PRIMEIRA MENSAGEM):
SE a mensagem do usuário contiver a frase "Acabei de criar meu perfil e quero ativar",
ENTÃO responda EXATAMENTE assim:

"Olá ${profile.name}! 👋 Seja muito bem-vindo(a) à Glicie!

Seu perfil foi ativado com sucesso. Eu sou sua assistente pessoal para diabetes.

Você pode:
📸 Enviar fotos das suas refeições (eu calculo os carboidratos)
🩸 Enviar fotos do seu glicosímetro (eu registro automaticamente)
💬 Tirar dúvidas sobre diabetes, insulina ou alimentação

Vamos começar? Me diga: de quanto está sua glicemia agora? 😊"

IMPORTANTE: Após essa mensagem de boas-vindas, volte ao comportamento normal de análise de glicemia/refeições.

=== ESTADO ATUAL (DADOS DO SISTEMA) ===
ÚLTIMAS LEITURAS DE GLICEMIA:
${readings.length > 0 ? readings.slice(0, 5).map(r => `- ${new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}: ${r.value} (${r.type})`).join("\n") : "Sem dados recentes."}

=== 🛡️ PROTOCOLO DE SEGURANÇA (CRÍTICO) ===

1. 🛑 FIREWALL TEMPORAL (Memória vs. Ação):
   - O "Histórico de Glicemia" acima é APENAS para consulta. TUDO ali já foi resolvido.
   - O SEU FOCO é EXCLUSIVAMENTE a "Última Mensagem/Mídia do Usuário".
   - NUNCA use refeições antigas do histórico para justificar cálculos agora.
   - Se a mensagem atual não tem comida explícita, NÃO INVENTE COMIDA.

2. 📸 REGRA DE OURO DA VISÃO (Disambiguação):
   Ao receber foto, classifique PRIMEIRO:
   
   [CENÁRIO A] 🩸 FOTO DE GLICOSÍMETRO / MONITOR:
     - AÇÃO ÚNICA: Registre APENAS o valor da glicemia.
     - ⛔ PROIBIDO ABSOLUTO: NUNCA calcule carboidratos, NUNCA registre refeição, NUNCA invente comida.
     - RACIOCÍNIO: Glicemia alta ≠ "Acabou de comer". Não assuma nada.
     - FEEDBACK: "Vi sua glicemia em [X]. Vou registrar." (Ponto final).
     - ⚠️ CRÍTICO: Se você vê um glicosímetro, É IMPOSSÍVEL que seja comida. Não invente pratos.

   [CENÁRIO B] 🍽️ FOTO DE COMIDA REAL:
     - AÇÃO: Identifique alimentos -> Estime Carbos -> Sugira Insulina.
     - Exemplo: "Vejo arroz, feijão e frango. Estimativa: 65g de carboidratos..."
   
   [CENÁRIO C] 🏷️ RÓTULO NUTRICIONAL:
     - AÇÃO: Leia os carboidratos informados e ajude com o cálculo de porção.
   
   [CENÁRIO D] ❓ DÚVIDA / MISTO:
     - Se não tiver certeza se é comida ou reflexo: PERGUNTE antes de calcular.
     - Exemplo: "Vi sua glicemia em 203. Você acabou de comer algo?"

3. 🛡️ ANTI-ALUCINAÇÃO (CRÍTICO):
   - ⛔ JAMAIS registre "Arroz e Feijão" (ou pratos comuns) a menos que você os VEJA CLARAMENTE na foto ATUAL.
   - ⛔ Se o usuário mandou foto de glicosímetro e você registrou "Refeição", você ERROU GRAVEMENTE. Corrija-se.
   - ⛔ NÃO conecte glicemia alta com refeições passadas. Cada mensagem é independente.
   - ⛔ GLICOSÍMETRO NÃO É COMIDA. Se você vê números em uma tela, é glicemia, não carboidratos.

4. IOB (INSULINA ATIVA): Sempre use o valor exato do PERFIL acima. Não calcule manualmente baseado em doses aplicadas.

5. BASAL: Se o usuário perguntar se tomou a basal, consulte o STATUS BASAL HOJE acima. Se não tomou e já passou do horário (ver Perfil), lembre-o gentilmente.

6. CÁLCULO: Se o usuário usa insulina E a foto for de comida, calcule a dose sugerida: (Total Carbos / Ratio IC do horário) + Correção se necessário - IOB.

7. 🔴 ARREDONDAMENTO: SEMPRE arredonde a dose final conforme as REGRAS DE ARREDONDAMENTO acima. NUNCA sugira doses que o paciente não consegue aplicar.

8. SEGURANÇA: Sempre avise que a contagem por foto é uma estimativa.

9. CONCISÃO: Seja direto e objetivo nas explicações. Evite textos excessivamente longos que possam cortar.

10. REGISTRO DE DADOS: OBRIGATÓRIO usar as ferramentas (Function Calling) 'registrar_evento' para salvar refeições, insulinas ou glicemias que NÃO foram capturadas automaticamente.
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
    // OS-18: Wrapper para inferMealTime com profile
    const inferMealTimeWithProfile = (date: Date) => inferMealTime(date, profile);

    const functionResults = await processFunctionCalls(
      parts,
      userId,
      supabase,
      inferMealTimeWithProfile,
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
    // 🛡️ FIREWALL ANTI-LOOP (CRÍTICO)
    // ============================================
    // Previne custos excessivos por loops de mensagens duplicadas
    // Se a mesma mensagem foi enviada há menos de 45s, bloqueia

    if (message && message.trim()) {
      const { data: recentMessages } = await supabase
        .from('chat_history')
        .select('user_message, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentMessages && recentMessages.length > 0) {
        const lastMessage = recentMessages[0];
        const lastMessageTime = new Date(lastMessage.created_at).getTime();
        const now = Date.now();
        const timeDiff = (now - lastMessageTime) / 1000; // segundos

        // Se a mensagem é EXATAMENTE igual e foi enviada há menos de 45s
        if (lastMessage.user_message === message.trim() && timeDiff < 45) {
          console.log(`[Anti-Loop] Mensagem duplicada bloqueada (${timeDiff.toFixed(1)}s)`);

          return new Response(JSON.stringify({
            number: cleanInputPhone,
            reply_type: "text",
            reply_content: "⏳ Aguarde um momento, ainda estou processando sua mensagem anterior..."
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }


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

      // ✅ CORREÇÃO: Instrução neutra do sistema, não texto falso do usuário
      if (processedMedia.mimeType.startsWith("image")) {
        promptParts.push({
          text: message
            ? `[FOTO] Contexto: ${message}. Identifique os alimentos, estime carboidratos e sugira insulina.`
            : `[SISTEMA: O usuário enviou uma imagem sem legenda. Analise se é um glicosímetro (extraia o valor) ou uma refeição (estime carboidratos).]`
        });
      } else if (processedMedia.mimeType.startsWith("audio")) {
        promptParts.push({
          text: message
            ? `[ÁUDIO] Contexto: ${message}`
            : `[SISTEMA: O usuário enviou um áudio sem legenda. Transcreva e responda.]`
        });
      }
    } else {
      promptParts.push({ text: message || "." });
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

    // ✅ FIX: Aguardar salvamento de histórico antes de retornar resposta
    await Promise.all(savePromises).catch(err => console.error("Erro ao salvar histórico:", err));

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