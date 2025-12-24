// Especialista em Processamento de Glicemia
// Responsabilidade: Extrair, validar e salvar leituras de glicemia

import { validateGlucose } from './validationService.ts';

export interface GlucoseMatch {
    value: number;
    type: string;
}

/**
 * Extrai valor de glicemia de mensagem de texto
 * 
 * Padrões aceitos:
 * - "Glicemia 103"
 * - "Glicemia de 103"
 * - "Glicemia atual 103"
 * - "Glicemia está em 103"
 * - "Gli 103"
 * - "Açúcar 103"
 * 
 * Validação:
 * - Valor entre 20-600 mg/dL (via validationService)
 * - Inferência de contexto por horário
 * 
 * @param message - Mensagem de texto do usuário
 * @returns Objeto com valor e tipo, ou null se não encontrado
 */
export function extractGlucoseFromText(message: string): GlucoseMatch | null {
    if (!message) return null;

    // REGEX ROBUSTO (Regex-First Architecture)
    const glucosePattern = /(?:glicemia|glicose|glucose|gli|açúcar)\s*(?:atual|agora|hoje|do momento)?\s*(?:está?|tá|é|foi|deu|marcou|mediu?)?\s*(?:em|de|a|:)?\s*(\d{2,3})/i;

    const match = message.match(glucosePattern);
    if (match && match[1]) {
        const value = parseInt(match[1]);

        // Validate via validationService (Safety guardrail)
        const validation = validateGlucose(value);
        if (!validation.isValid) {
            console.warn(`[GlucoseService] ${validation.error}`);
            return null;
        }

        // Infer context based on time
        const hour = new Date().getHours();
        let type = "Correction";
        if (hour >= 6 && hour < 9) type = "Fasting";
        else if (hour >= 11 && hour < 13) type = "Pre-Meal";
        else if (hour >= 13 && hour < 15) type = "Post-Meal";
        else if (hour >= 18 && hour < 20) type = "Pre-Meal";
        else if (hour >= 20 && hour < 22) type = "Post-Meal";

        return { value, type };
    }

    return null;
}

/**
 * Processa e salva leitura de glicemia com proteção contra duplicatas
 * 
 * Proteções implementadas:
 * 1. Verificação de duplicata (janela de 10 minutos)
 * 2. Insert simples (mantém compatibilidade com código atual)
 * 
 * @param supabase - Cliente Supabase
 * @param userId - ID do usuário
 * @param message - Mensagem de texto
 * @returns GlucoseMatch se processado com sucesso, null caso contrário
 */
export async function processGlucoseRegex(
    supabase: any,
    userId: string,
    message: string
): Promise<GlucoseMatch | null> {
    const match = extractGlucoseFromText(message);
    if (!match) return null;

    console.log(`[GlucoseService] Capturado: ${match.value} mg/dL (${match.type})`);

    // 🚨 PROTEÇÃO: Verificação de duplicata (janela de 10 minutos)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
        .from("glucose_readings")
        .select("id")
        .eq("user_id", userId)
        .eq("value", match.value)
        .gte("timestamp", tenMinutesAgo)
        .limit(1);

    if (existing && existing.length > 0) {
        console.log("[GlucoseService] Duplicata detectada. Ignorando.");
        return match; // Retorna match para gerar feedback, mas não salva
    }

    // Salvar no banco (insert simples, igual ao código original)
    const { error } = await supabase
        .from("glucose_readings")
        .insert({
            user_id: userId,
            value: match.value,
            type: match.type,
            timestamp: new Date().toISOString(),
        });

    if (error) {
        console.error("[GlucoseService] Erro ao salvar:", error);
        return null;
    }

    console.log("[GlucoseService] Salvo com sucesso");
    return match;
}
