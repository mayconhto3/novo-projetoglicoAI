// OS-13: Stripe Webhook Listener
// Responsabilidade: Receber eventos do Stripe e atualizar status de assinatura
// Autor: Squad Backend
// Data: 2026-01-02

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Stripe } from "https://esm.sh/stripe@14.10.0?target=deno";

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

console.log("🚀 Stripe Webhook Listener Iniciado");

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req) => {
    // ============================================================================
    // 1. VALIDAÇÃO DE ASSINATURA (Segurança Crítica)
    // ============================================================================

    const signature = req.headers.get("Stripe-Signature");

    if (!signature) {
        console.error("⚠️ Tentativa de acesso sem assinatura Stripe");
        return new Response("Webhook Error: Missing Stripe-Signature header", {
            status: 400
        });
    }

    if (!endpointSecret) {
        console.error("⚠️ STRIPE_WEBHOOK_SECRET não configurado");
        return new Response("Webhook Error: Server misconfiguration", {
            status: 500
        });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
        // Valida assinatura criptográfica do Stripe
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            endpointSecret
        );
        console.log(`✅ Assinatura validada para evento: ${event.type}`);
    } catch (err) {
        console.error(`⚠️ Erro de assinatura: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, {
            status: 400
        });
    }

    // ============================================================================
    // 2. INICIALIZAR SUPABASE (SERVICE ROLE - Modo Admin)
    // ============================================================================

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`🔔 Processando evento: ${event.type}`);

    // ============================================================================
    // 3. PROCESSAR EVENTOS
    // ============================================================================

    try {
        switch (event.type) {

            // ========================================================================
            // ✅ CASO 1: PAGAMENTO APROVADO (Checkout Completo)
            // ========================================================================

            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.supabase_user_id;
                const userPhone = session.metadata?.phone;

                if (!userId) {
                    console.warn("⚠️ Webhook recebido sem supabase_user_id no metadata");
                    break;
                }

                console.log(`💰 Pagamento confirmado!`);
                console.log(`   User ID: ${userId}`);
                console.log(`   Phone: ${userPhone}`);
                console.log(`   Customer: ${session.customer}`);
                console.log(`   Amount: ${session.amount_total ? session.amount_total / 100 : 'N/A'}`);

                // Calcular data de vencimento (30 dias a partir de agora)
                const subscriptionEnds = new Date();
                subscriptionEnds.setDate(subscriptionEnds.getDate() + 30);

                const { error } = await supabase
                    .from("profiles")
                    .update({
                        subscription_status: "active",
                        stripe_customer_id: session.customer as string,
                        trial_ends_at: subscriptionEnds.toISOString(),
                        // Resetar usage_stats para novo ciclo
                        usage_stats: {
                            text: 0,
                            image: 0,
                            audio: 0,
                            last_date: null
                        }
                    })
                    .eq("id", userId);

                if (error) {
                    console.error("❌ Erro ao atualizar profile:", error);
                } else {
                    console.log(`✅ Usuário ${userId} ATIVADO com sucesso!`);
                    console.log(`   Válido até: ${subscriptionEnds.toISOString()}`);
                }
                break;
            }

            // ========================================================================
            // ❌ CASO 2: ASSINATURA CANCELADA
            // ========================================================================

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const stripeCustomerId = subscription.customer as string;

                console.log(`🚫 Assinatura cancelada para customer: ${stripeCustomerId}`);

                // Buscar usuário pelo stripe_customer_id
                const { data: user, error: fetchError } = await supabase
                    .from("profiles")
                    .select("id, name")
                    .eq("stripe_customer_id", stripeCustomerId)
                    .single();

                if (fetchError || !user) {
                    console.warn(`⚠️ Usuário não encontrado para customer ${stripeCustomerId}`);
                    break;
                }

                console.log(`   Bloqueando usuário: ${user.id} (${user.name})`);

                const { error } = await supabase
                    .from("profiles")
                    .update({
                        subscription_status: "cancelled"
                    })
                    .eq("id", user.id);

                if (error) {
                    console.error("❌ Erro ao bloquear usuário:", error);
                } else {
                    console.log(`✅ Usuário ${user.id} bloqueado (cancelled)`);
                }
                break;
            }

            // ========================================================================
            // ❌ CASO 3: FALHA NO PAGAMENTO
            // ========================================================================

            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const stripeCustomerId = invoice.customer as string;

                console.log(`💳 Falha no pagamento para customer: ${stripeCustomerId}`);
                console.log(`   Invoice: ${invoice.id}`);
                console.log(`   Tentativa: ${invoice.attempt_count}`);

                // Buscar usuário
                const { data: user, error: fetchError } = await supabase
                    .from("profiles")
                    .select("id, name")
                    .eq("stripe_customer_id", stripeCustomerId)
                    .single();

                if (fetchError || !user) {
                    console.warn(`⚠️ Usuário não encontrado para customer ${stripeCustomerId}`);
                    break;
                }

                // Bloquear após 3 tentativas falhadas
                if (invoice.attempt_count && invoice.attempt_count >= 3) {
                    console.log(`   Bloqueando usuário após ${invoice.attempt_count} tentativas`);

                    const { error } = await supabase
                        .from("profiles")
                        .update({
                            subscription_status: "expired"
                        })
                        .eq("id", user.id);

                    if (error) {
                        console.error("❌ Erro ao bloquear usuário:", error);
                    } else {
                        console.log(`✅ Usuário ${user.id} bloqueado (expired)`);
                    }
                } else {
                    console.log(`   Aguardando próxima tentativa (${invoice.attempt_count}/3)`);
                }
                break;
            }

            // ========================================================================
            // 📋 CASO 4: OUTROS EVENTOS (Log apenas)
            // ========================================================================

            default:
                console.log(`ℹ️ Evento não processado: ${event.type}`);
        }
    } catch (err) {
        console.error("❌ Erro interno no processamento:", err);

        if (err instanceof Error) {
            console.error("   Stack:", err.stack);
        }

        return new Response("Server Error", {
            status: 500
        });
    }

    // ============================================================================
    // 4. RETORNAR SUCESSO
    // ============================================================================

    return new Response(
        JSON.stringify({
            received: true,
            event_type: event.type,
            processed_at: new Date().toISOString()
        }),
        {
            headers: { "Content-Type": "application/json" },
            status: 200
        }
    );
});
