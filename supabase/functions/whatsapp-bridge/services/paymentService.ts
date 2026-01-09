// OS-12: Payment Service (Stripe Integration)
// Responsabilidade: Gerar links de checkout dinâmicos para assinaturas
// Autor: Squad Backend
// Data: 2026-01-01

import { Stripe } from "https://esm.sh/stripe@14.10.0?target=deno";

/**
 * Cria uma sessão de checkout no Stripe e retorna o link de pagamento
 * 
 * @param supabase - Cliente Supabase
 * @param userId - ID do usuário no Supabase
 * @param userPhone - Telefone do usuário (para metadata)
 * @param priceId - ID do produto no Stripe (price_...)
 * @returns URL da sessão de checkout ou fallback
 */
export async function createCheckoutSession(
    supabase: any,
    userId: string,
    userPhone: string,
    priceId: string
): Promise<string> {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
        console.error("[Payment] STRIPE_SECRET_KEY não configurada");
        return "https://glucoai.com/premium"; // Fallback
    }

    const stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
    });

    try {
        // ============================================================================
        // 1. VERIFICAR SE USUÁRIO JÁ TEM CUSTOMER ID
        // ============================================================================

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_customer_id, name, email')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error("[Payment] Erro ao buscar profile:", profileError);
            return "https://glucoai.com/premium";
        }

        let customerId = profile?.stripe_customer_id;

        // ============================================================================
        // 2. SE NÃO TIVER, CRIAR CUSTOMER NO STRIPE
        // ============================================================================

        if (!customerId) {
            console.log(`[Payment] Criando novo customer para ${userPhone}`);

            const customer = await stripe.customers.create({
                name: profile?.name || undefined,
                email: profile?.email || undefined,
                phone: userPhone,
                metadata: {
                    supabase_user_id: userId,
                    phone: userPhone,
                    source: 'whatsapp_gatekeeper'
                }
            });

            customerId = customer.id;
            console.log(`[Payment] Customer criado: ${customerId}`);

            // ✅ FIX: Aguardar salvamento antes de continuar (sintaxe Supabase correta)
            const { error: saveError } = await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);

            if (saveError) {
                console.error('[Payment] Erro ao salvar customer_id:', saveError);
            } else {
                console.log('[Payment] stripe_customer_id salvo');
            }
        } else {
            console.log(`[Payment] Customer existente: ${customerId}`);
        }

        // ============================================================================
        // 3. CRIAR SESSÃO DE CHECKOUT
        // ============================================================================

        // Preparar URLs de retorno com encoding correto
        const returnPhone = userPhone.replace(/\D/g, '');

        // BUGFIX: Codificar textos para URL (remove espaços e acentos)
        const msgSuccess = encodeURIComponent('✅ Pagamento realizado! Meu acesso já está liberado?');
        const msgCancel = encodeURIComponent('❌ Tive problema no pagamento. Pode me ajudar?');

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            mode: 'subscription',

            // URLs de retorno (WhatsApp) com encoding correto
            success_url: `https://wa.me/${returnPhone}?text=${msgSuccess}`,
            cancel_url: `https://wa.me/${returnPhone}?text=${msgCancel}`,

            // Metadata para webhook identificar
            metadata: {
                supabase_user_id: userId,
                phone: userPhone,
                source: 'whatsapp_gatekeeper'
            },

            // Configurações adicionais
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            customer_update: {
                address: 'auto',
                name: 'auto'
            }
        });

        console.log(`[Payment] Sessão criada: ${session.id}`);
        return session.url || "https://glucoai.com/premium";

    } catch (error) {
        console.error("[Payment] Erro ao criar checkout:", error);

        // Log detalhado do erro
        if (error instanceof Error) {
            console.error("[Payment] Erro detalhado:", {
                message: error.message,
                stack: error.stack
            });
        }

        return "https://glucoai.com/premium"; // Fallback
    }
}

/**
 * Valida se as configurações do Stripe estão corretas
 * 
 * @returns true se configurado corretamente
 */
export function validateStripeConfig(): boolean {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID");

    if (!stripeKey) {
        console.error("[Payment] ❌ STRIPE_SECRET_KEY não configurada");
        return false;
    }

    if (!priceId) {
        console.error("[Payment] ❌ STRIPE_PRICE_ID não configurada");
        return false;
    }

    console.log("[Payment] ✅ Configuração Stripe OK");
    return true;
}
