import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuração
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const N8N_WEBHOOK = Deno.env.get("N8N_OUTBOUND_WEBHOOK_URL")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// HUMANIZAÇÃO ANTI-BLOQUEIO WHATSAPP
// ============================================================================

/**
 * Retorna mensagem aleatória de lembrete de almoço
 * 
 * Objetivo: Evitar assinatura de SPAM (mensagens idênticas)
 * WhatsApp detecta bulk messaging quando:
 * - Mensagens idênticas
 * - Enviadas no mesmo milissegundo
 * - Para múltiplos números
 * 
 * Spintext resolve o problema de conteúdo idêntico
 */
function getLunchMessage(): string {
    const messages = [
        "🍽️ Hora do almoço! Não esqueça de mandar a foto do prato.",
        "Oi! Já almoçou? 🥘 Manda a foto pra gente calcular os carboidratos.",
        "Bora registrar esse almoço? 🥗 Estou aguardando sua foto!",
        "Lembrete do nutri: Hora de comer! 🍗 Não esqueça o registro.",
        "Toc toc! 🥣 O almoço já saiu? Manda foto aí!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Retorna mensagem aleatória de lembrete de glicemia
 * 
 * Objetivo: Evitar assinatura de SPAM (mensagens idênticas)
 */
function getGlucoseMessage(): string {
    const messages = [
        "🩸 Faz um tempinho que não vejo sua glicemia. Que tal medir agora?",
        "Oi! Como está o açúcar no sangue? 🍬 Hora de medir!",
        "Vamos verificar a glicemia? 💉 É rapidinho e importante.",
        "Passando para lembrar da medição de glicemia! 📊",
        "Sua saúde em primeiro lugar! 💙 Já mediu a glicose hoje?"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Retorna mensagem aleatória de lembrete de insulina basal
 * 
 * Objetivo: Evitar assinatura de SPAM (mensagens idênticas)
 */
function getBasalMessage(basalBrand: string, dose: number, period: string): string {
    const messages = [
        `💉 Lembrete: Hora da sua ${basalBrand} (${dose}u) - ${period}!`,
        `Oi! Não esqueça da insulina basal 💙 ${dose}u de ${basalBrand} (${period})`,
        `🕐 Chegou a hora! ${basalBrand} ${dose}u - ${period}. Já aplicou?`,
        `Lembrete importante: ${basalBrand} ${dose}u (${period}). Vamos lá! 💪`,
        `Sua ${basalBrand} está te esperando! 💉 ${dose}u - ${period}`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Retention Scheduler - Sistema de Notificações Inteligentes
 * 
 * Objetivo: Engajar usuários com lembretes contextuais
 * 
 * Estratégia:
 * 1. Busca apenas usuários que QUEREM notificações (smart_notifications = true)
 * 2. Verifica padrões de uso (almoço, glicemia)
 * 3. Envia lembretes via n8n → WhatsApp
 * 4. Registra envio para evitar spam
 * 
 * Frequência: A cada hora (via Supabase Cron)
 */
serve(async (req) => {
    console.log('[Retention Scheduler] Iniciando verificação...');

    try {
        // 1. Busca usuários que QUEREM receber notificações
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, medical_data')
            .eq('smart_notifications', true);

        if (error) {
            console.error('[Retention] Erro ao buscar usuários:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!users || users.length === 0) {
            console.log('[Retention] Nenhum usuário ativo para notificar.');
            return new Response(JSON.stringify({
                message: 'Nenhum usuário com notificações ativas.',
                processed: 0
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[Retention] ${users.length} usuários ativos encontrados.`);

        const updates: string[] = [];

        // 2. Processa cada usuário (COM HUMANIZAÇÃO)
        for (const user of users) {
            // 🛡️ SECURITY: Delay aleatório entre 2s e 5s para "humanizar" o envio
            // Evita disparos simultâneos que geram bloqueio no WhatsApp
            // Meta detecta bulk spam quando mensagens são enviadas no mesmo milissegundo
            const delay = Math.floor(Math.random() * 3000) + 2000; // 2000-5000ms
            await new Promise(resolve => setTimeout(resolve, delay));

            console.log(`[Retention] Processando usuário ${user.id}(delay: ${delay}ms)...`);

            // Verifica se tem telefone configurado
            if (!user.medical_data?.phone) {
                console.log(`[Retention] Usuário ${user.id} sem telefone.Pulando.`);
                continue;
            }

            // Verifica Basal (Se passou do horário e não tomou) - NOVO
            await checkBasal(user, updates);

            // Verifica Almoço (Se é hora do almoço e não comeu)
            await checkLunch(user, updates);

            // Verifica Glicemia (Se passou 6h sem medir)
            await checkGlucose(user, updates);
        }

        console.log(`[Retention] Processamento concluído.${updates.length} notificações enviadas.`);

        return new Response(JSON.stringify({
            message: 'Processamento concluído.',
            users_checked: users.length,
            notifications_sent: updates.length,
            user_ids: updates
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Retention] Erro fatal:', error);
        return new Response(JSON.stringify({
            error: 'Erro interno',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Verifica se usuário precisa de lembrete de insulina basal
 * 
 * Lógica:
 * - Verifica se o usuário usa insulina basal
 * - Checa se passou 1h do horário prescrito (manhã ou noite)
 * - Verifica se já tomou hoje (via insulin_history)
 * - Anti-spam: Máximo 1 notificação por período (manhã/noite) por dia
 */
async function checkBasal(user: any, updates: string[]) {
    // Verifica se o usuário usa insulina basal
    if (!user.medical_data?.usesInsulin || !user.medical_data?.basalInsulin?.brand) {
        return;
    }

    const basal = user.medical_data.basalInsulin;
    const now = new Date();
    const currentHour = now.getUTCHours() - 3; // BRT = UTC-3
    const currentMinutes = now.getUTCMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinutes;

    console.log(`[Basal Check] Verificando usuário ${user.id}...`);

    // Verifica MANHÃ
    if (basal.morningDose && basal.morningTime) {
        const [mHour, mMin] = basal.morningTime.split(':').map(Number);
        const scheduledTimeInMinutes = mHour * 60 + mMin;
        const diffMinutes = currentTimeInMinutes - scheduledTimeInMinutes;

        // Se passou 60 minutos do horário (1h de tolerância)
        if (diffMinutes >= 60 && diffMinutes <= 180) { // Janela de 1h a 3h após
            const taken = await checkIfBasalTaken(user.id, 'morning');
            if (!taken) {
                const alreadySent = await checkIfBasalNotificationSent(user.id, 'basal_morning');
                if (!alreadySent) {
                    const message = getBasalMessage(basal.brand, basal.morningDose, 'Manhã');
                    const success = await sendToN8N(user, message);
                    if (success) {
                        await logSent(user.id, 'basal_morning', message);
                        updates.push(user.id);
                        console.log(`[Basal Check] ✅ Lembrete de basal(manhã) enviado para ${user.id} `);
                    }
                }
            }
        }
    }

    // Verifica NOITE
    if (basal.nightDose && basal.nightTime) {
        const [nHour, nMin] = basal.nightTime.split(':').map(Number);
        const scheduledTimeInMinutes = nHour * 60 + nMin;
        const diffMinutes = currentTimeInMinutes - scheduledTimeInMinutes;

        // Se passou 60 minutos do horário (1h de tolerância)
        if (diffMinutes >= 60 && diffMinutes <= 180) { // Janela de 1h a 3h após
            const taken = await checkIfBasalTaken(user.id, 'night');
            if (!taken) {
                const alreadySent = await checkIfBasalNotificationSent(user.id, 'basal_night');
                if (!alreadySent) {
                    const message = getBasalMessage(basal.brand, basal.nightDose, 'Noite');
                    const success = await sendToN8N(user, message);
                    if (success) {
                        await logSent(user.id, 'basal_night', message);
                        updates.push(user.id);
                        console.log(`[Basal Check] ✅ Lembrete de basal(noite) enviado para ${user.id} `);
                    }
                }
            }
        }
    }
}

/**
 * Verifica se o usuário já tomou a basal hoje (período específico)
 */
async function checkIfBasalTaken(userId: string, period: 'morning' | 'night'): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Define janela de horário para cada período
    let startHour = 0, endHour = 24;
    if (period === 'morning') {
        startHour = 4;  // 04:00
        endHour = 16;   // 16:00
    } else {
        startHour = 16; // 16:00
        endHour = 28;   // 04:00 do dia seguinte (28 = 4 + 24)
    }

    const { count } = await supabase
        .from('insulin_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('insulin_type', 'Basal')
        .gte('created_at', today.toISOString());

    // Se encontrou algum registro de Basal hoje, considera como tomado
    // (A lógica de horário está simplificada - pode ser refinada)
    return (count && count > 0) || false;
}

/**
 * Verifica se já enviamos notificação de basal hoje
 */
async function checkIfBasalNotificationSent(userId: string, type: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('notification_type', type)
        .gte('sent_at', `${today} T00:00:00`);

    return (count && count > 0) || false;
}

/**
 * Verifica se usuário precisa de lembrete de almoço
 * 
 * Lógica:
 * - Horário: 13:00 - 14:00 (horário de almoço típico)
 * - Condição: Não registrou refeição nas últimas 4 horas
 * - Anti-spam: Máximo 1 notificação de almoço por dia
 */
async function checkLunch(user: any, updates: string[]) {
    const now = new Date();
    // Ajuste de fuso horário (BRT = UTC-3)
    const hour = now.getUTCHours() - 3;

    // Só verifica entre 13:00 e 14:00
    if (hour < 13 || hour > 14) {
        return;
    }

    console.log(`[Lunch Check] Verificando usuário ${user.id}...`);

    // Verifica se comeu nas últimas 4 horas
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { count: mealCount } = await supabase
        .from('meal_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', fourHoursAgo);

    if (mealCount && mealCount > 0) {
        console.log(`[Lunch Check] Usuário ${user.id} já comeu.OK.`);
        return;
    }

    // Verifica se já mandamos hoje (anti-spam)
    const today = new Date().toISOString().split('T')[0];
    const { count: sentToday } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('notification_type', 'lunch')
        .gte('sent_at', `${today} T00:00:00`);

    if (sentToday && sentToday > 0) {
        console.log(`[Lunch Check] Já enviamos lembrete de almoço hoje para ${user.id}.`);
        return;
    }

    // Envia notificação (com variação de mensagem)
    const message = getLunchMessage();
    const success = await sendToN8N(user, message);

    if (success) {
        await logSent(user.id, 'lunch', message);
        updates.push(user.id);
        console.log(`[Lunch Check] ✅ Lembrete de almoço enviado para ${user.id} `);
    }
}

/**
 * Verifica se usuário precisa de lembrete de glicemia
 * 
 * Lógica:
 * - Condição: Não mediu glicemia nas últimas 6 horas
 * - Anti-spam: Máximo 1 notificação de glicemia por dia
 */
async function checkGlucose(user: any, updates: string[]) {
    console.log(`[Glucose Check] Verificando usuário ${user.id}...`);

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { count: glucoseCount } = await supabase
        .from('glucose_readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('timestamp', sixHoursAgo);

    if (glucoseCount && glucoseCount > 0) {
        console.log(`[Glucose Check] Usuário ${user.id} mediu recentemente.OK.`);
        return;
    }

    // Verifica se já mandamos hoje (anti-spam)
    const today = new Date().toISOString().split('T')[0];
    const { count: sentToday } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('notification_type', 'glucose')
        .gte('sent_at', `${today} T00:00:00`);

    if (sentToday && sentToday > 0) {
        console.log(`[Glucose Check] Já enviamos lembrete de glicemia hoje para ${user.id}.`);
        return;
    }

    // Envia notificação (com variação de mensagem)
    const message = getGlucoseMessage();
    const success = await sendToN8N(user, message);

    if (success) {
        await logSent(user.id, 'glucose', message);
        updates.push(user.id);
        console.log(`[Glucose Check] ✅ Lembrete de glicemia enviado para ${user.id} `);
    }
}

/**
 * Envia mensagem via n8n → WhatsApp
 * 
 * @param user - Objeto do usuário (com medical_data.phone)
 * @param message - Mensagem a enviar
 * @returns true se enviou com sucesso, false caso contrário
 */
async function sendToN8N(user: any, message: string): Promise<boolean> {
    if (!user.medical_data?.phone) {
        console.error(`[n8n] Usuário ${user.id} sem telefone.`);
        return false;
    }

    if (!N8N_WEBHOOK) {
        console.error('[n8n] N8N_OUTBOUND_WEBHOOK_URL não configurado!');
        return false;
    }

    try {
        console.log(`[n8n] Enviando para ${user.medical_data.phone}...`);

        const response = await fetch(N8N_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: user.medical_data.phone,
                message: message,
                type: 'smart_reminder'
            })
        });

        if (!response.ok) {
            console.error(`[n8n] Erro HTTP ${response.status}: ${await response.text()} `);
            return false;
        }

        console.log(`[n8n] ✅ Mensagem enviada para ${user.medical_data.phone} `);
        return true;

    } catch (e) {
        console.error("[n8n] Erro ao enviar:", e);
        return false;
    }
}

/**
 * Registra envio de notificação no banco
 * 
 * @param userId - ID do usuário
 * @param type - Tipo de notificação ('lunch', 'glucose', etc)
 * @param message - Mensagem enviada (para preview)
 */
async function logSent(userId: string, type: string, message: string) {
    try {
        const preview = message.substring(0, 50); // Primeiras 50 caracteres

        const { error } = await supabase
            .from('notification_logs')
            .insert({
                user_id: userId,
                notification_type: type,
                message_preview: preview,
                success: true
            });

        if (error) {
            console.error('[Log] Erro ao registrar envio:', error);
        }
    } catch (e) {
        console.error('[Log] Erro ao salvar log:', e);
    }
}
