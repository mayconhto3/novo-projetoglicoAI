// OS-11: Gatekeeper Service
// Responsabilidade: Controlar acesso baseado em assinatura e limites de uso
// Autor: Squad Backend
// Data: 2025-12-31

import { UserProfile } from './profileService.ts';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface UsageStats {
    text: number;
    image: number;
    audio: number;
    last_date: string | null;
}

export interface GatekeeperResult {
    allowed: boolean;
    reason?: 'trial_expired' | 'subscription_inactive' | 'limit_exceeded';
    message?: string;
    stats?: UsageStats;
}

export type MessageType = 'text' | 'image' | 'audio';

// ============================================================================
// CONFIGURAÇÕES DE LIMITES (CEO pode ajustar aqui)
// ============================================================================

const LIMITS = {
    trial: {
        text: 50,      // 50 mensagens de texto por dia
        image: 2,      // 2 fotos por dia
        audio: 5       // 5 áudios por dia
    },
    active: {
        text: Infinity,  // Ilimitado
        image: Infinity,
        audio: Infinity
    }
} as const;

// Mensagens de bloqueio (CEO pode customizar)
const BLOCK_MESSAGES = {
    trial_expired: `🔒 *Seu período de teste gratuito acabou.*

Espero que a Glicie tenha te ajudado nestes 7 dias! 

Para continuar tendo:
✅ Previsões de insulina por foto
✅ Análise de carboidratos
✅ Controle total da glicemia
✅ Suporte via WhatsApp

Assine o plano Premium por apenas *R$ 29,90/mês*.

💳 *Clique aqui para assinar:* [link em breve]`,

    subscription_inactive: `🔒 *Sua assinatura está inativa.*

Para continuar usando a Glicie, renove sua assinatura.

💳 *Clique aqui para renovar:* [link em breve]`,

    limit_exceeded: (type: MessageType, limit: number) => `⚠️ *Limite diário atingido*

Você atingiu o limite de *${limit} ${type === 'text' ? 'mensagens' :
            type === 'image' ? 'fotos' :
                'áudios'
        }* por dia no período de teste.

🎁 *Quer uso ilimitado?*
Assine o plano Premium e tenha acesso total sem limites!

💳 *Clique aqui para assinar:* [link em breve]`
};

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Verifica se o usuário pode enviar a mensagem baseado em:
 * 1. Status da assinatura (trial, active, expired, cancelled)
 * 2. Data de vencimento do trial
 * 3. Limites de uso diário
 * 
 * @param profile - Perfil do usuário
 * @param messageType - Tipo de mensagem (text, image, audio)
 * @param supabase - Cliente Supabase
 * @returns Resultado do gatekeeper (allowed + reason + message)
 */
export async function checkGatekeeper(
    profile: UserProfile,
    messageType: MessageType,
    supabase: any
): Promise<GatekeeperResult> {
    const today = new Date().toISOString().split('T')[0];

    // ============================================================================
    // 🕵️ DEBUG LOGS (Tech Lead Request)
    // ============================================================================
    console.log(`[Gatekeeper DEBUG] ========== INÍCIO DA VERIFICAÇÃO ==========`);
    console.log(`[Gatekeeper DEBUG] User ID: ${profile.id || 'UNDEFINED'}`);
    console.log(`[Gatekeeper DEBUG] Status no Banco: "${profile.subscription_status}" (tipo: ${typeof profile.subscription_status})`);
    console.log(`[Gatekeeper DEBUG] Vencimento: ${profile.trial_ends_at || 'UNDEFINED'}`);
    console.log(`[Gatekeeper DEBUG] Hoje (ISO): ${new Date().toISOString()}`);
    console.log(`[Gatekeeper DEBUG] Hoje (Date): ${today}`);
    console.log(`[Gatekeeper DEBUG] Usage Stats: ${JSON.stringify(profile.usage_stats)}`);
    console.log(`[Gatekeeper DEBUG] ================================================`);

    // Inicializar stats com valores padrão se não existir
    let stats: UsageStats = profile.usage_stats || {
        text: 0,
        image: 0,
        audio: 0,
        last_date: null
    };

    // ============================================================================
    // 1. RESET DIÁRIO (Lazy Reset)
    // ============================================================================

    if (stats.last_date !== today) {
        console.log(`[Gatekeeper] Reset diário para user ${profile.id || 'unknown'}`);
        stats = {
            text: 0,
            image: 0,
            audio: 0,
            last_date: today
        };
    }

    // ============================================================================
    // 2. VERIFICAR VENCIMENTO DO TRIAL
    // ============================================================================

    if (profile.subscription_status === 'trial' && profile.trial_ends_at) {
        const trialEnds = new Date(profile.trial_ends_at);
        const now = new Date();

        if (now > trialEnds) {
            console.log(`[Gatekeeper] Trial vencido para user ${profile.id || 'unknown'}`);

            // Atualizar status no banco (Fire and Forget)
            supabase
                .from('profiles')
                .update({ subscription_status: 'expired' })
                .eq('id', profile.id)
                .then(() => console.log('[Gatekeeper] Status atualizado para expired'))
                .catch((err: any) => console.error('[Gatekeeper] Erro ao atualizar status:', err));

            return {
                allowed: false,
                reason: 'trial_expired',
                message: BLOCK_MESSAGES.trial_expired,
                stats
            };
        }
    }

    // ============================================================================
    // 3. BLOQUEIO TOTAL PARA ASSINATURAS INATIVAS
    // ============================================================================

    if (profile.subscription_status === 'expired' || profile.subscription_status === 'cancelled') {
        console.log(`[Gatekeeper] Assinatura inativa (${profile.subscription_status}) para user ${profile.id || 'unknown'}`);

        return {
            allowed: false,
            reason: 'subscription_inactive',
            message: BLOCK_MESSAGES.subscription_inactive,
            stats
        };
    }

    // ============================================================================
    // 4. VERIFICAR LIMITES DE USO (APENAS PARA TRIAL)
    // ============================================================================

    if (profile.subscription_status === 'trial') {
        const currentCount = stats[messageType] || 0;
        const limit = LIMITS.trial[messageType];

        if (currentCount >= limit) {
            console.log(`[Gatekeeper] Limite excedido: ${messageType} (${currentCount}/${limit})`);

            return {
                allowed: false,
                reason: 'limit_exceeded',
                message: BLOCK_MESSAGES.limit_exceeded(messageType, limit),
                stats
            };
        }
    }

    // ============================================================================
    // 5. INCREMENTAR CONTADOR
    // ============================================================================

    stats[messageType] = (stats[messageType] || 0) + 1;
    console.log(`[Gatekeeper] Contador incrementado: ${messageType} = ${stats[messageType]}`);

    // ============================================================================
    // 6. SALVAR STATS NO BANCO (Fire and Forget - não bloqueia resposta)
    // ============================================================================

    supabase
        .from('profiles')
        .update({ usage_stats: stats })
        .eq('id', profile.id)
        .then(() => console.log(`[Gatekeeper] Stats salvos: ${JSON.stringify(stats)}`))
        .catch((err: any) => console.error('[Gatekeeper] Erro ao salvar stats:', err));

    // ============================================================================
    // 7. LIBERADO - RETORNAR SUCESSO
    // ============================================================================

    return {
        allowed: true,
        stats
    };
}

/**
 * Detecta o tipo de mensagem baseado no payload do WhatsApp
 * 
 * @param body - Payload do webhook do WhatsApp
 * @returns Tipo de mensagem (text, image, audio)
 */
export function detectMessageType(body: any): MessageType {
    try {
        const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (!message) {
            console.log('[Gatekeeper] Mensagem não encontrada no payload, assumindo text');
            return 'text';
        }

        const type = message.type;

        if (type === 'image') {
            console.log('[Gatekeeper] Tipo detectado: image');
            return 'image';
        }

        if (type === 'audio' || type === 'voice') {
            console.log('[Gatekeeper] Tipo detectado: audio');
            return 'audio';
        }

        console.log(`[Gatekeeper] Tipo detectado: text (original: ${type})`);
        return 'text';
    } catch (error) {
        console.error('[Gatekeeper] Erro ao detectar tipo de mensagem:', error);
        return 'text'; // Fallback seguro
    }
}

/**
 * Formata stats para logging/debug
 * 
 * @param stats - Estatísticas de uso
 * @returns String formatada
 */
export function formatStats(stats: UsageStats): string {
    return `text: ${stats.text}, image: ${stats.image}, audio: ${stats.audio}, last_date: ${stats.last_date}`;
}

/**
 * Verifica se o usuário está próximo do limite (para avisos preventivos)
 * 
 * @param stats - Estatísticas de uso
 * @param messageType - Tipo de mensagem
 * @param subscriptionStatus - Status da assinatura
 * @returns true se está próximo do limite (>= 80%)
 */
export function isNearLimit(
    stats: UsageStats,
    messageType: MessageType,
    subscriptionStatus: string
): boolean {
    if (subscriptionStatus !== 'trial') return false;

    const currentCount = stats[messageType] || 0;
    const limit = LIMITS.trial[messageType];

    return currentCount >= (limit * 0.8); // 80% do limite
}
