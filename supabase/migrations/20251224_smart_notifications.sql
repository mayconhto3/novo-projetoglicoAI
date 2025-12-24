-- Migration: Sistema de Notificações Inteligentes
-- Data: 24/12/2025
-- Objetivo: Adicionar suporte para notificações smart respeitando preferência do usuário

-- 1. Adicionar flag de preferência no Perfil (Padrão: TRUE/Ativo)
-- Permite que usuário controle se quer receber lembretes inteligentes
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS smart_notifications BOOLEAN DEFAULT true;

-- Comentário explicativo
COMMENT ON COLUMN profiles.smart_notifications IS 
'Controla se usuário quer receber notificações inteligentes via WhatsApp (lembretes de almoço, glicemia, etc). Padrão: true';

-- 2. Tabela de Logs de Notificações
-- Evita spam: garante que não enviamos a mesma notificação múltiplas vezes
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL, -- 'lunch', 'glucose', 'inactivity'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    message_preview TEXT, -- Primeiras palavras da mensagem (para debug)
    success BOOLEAN DEFAULT true -- Se envio foi bem-sucedido
);

-- Comentários explicativos
COMMENT ON TABLE notification_logs IS 
'Registro de todas as notificações enviadas. Usado para evitar spam e para analytics.';

COMMENT ON COLUMN notification_logs.notification_type IS 
'Tipo de notificação: lunch (lembrete de almoço), glucose (lembrete de glicemia), inactivity (usuário inativo)';

COMMENT ON COLUMN notification_logs.message_preview IS 
'Preview da mensagem enviada (primeiras 50 caracteres) para facilitar debug';

-- 3. Índices para Performance
-- Scheduler faz queries frequentes por user_id + tipo + data
CREATE INDEX IF NOT EXISTS idx_notif_logs_check 
ON notification_logs(user_id, notification_type, sent_at DESC);

-- Índice para analytics (quantas notificações por tipo)
CREATE INDEX IF NOT EXISTS idx_notif_logs_type 
ON notification_logs(notification_type, sent_at DESC);

-- Índice para cleanup (deletar logs antigos)
CREATE INDEX IF NOT EXISTS idx_notif_logs_cleanup 
ON notification_logs(sent_at);

-- 4. Row Level Security (RLS)
-- Usuário só pode ver seus próprios logs
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
ON notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Service role pode inserir (scheduler)
CREATE POLICY "Service role can insert notification logs"
ON notification_logs FOR INSERT
WITH CHECK (true);

-- 5. Função auxiliar para cleanup de logs antigos (opcional)
-- Mantém apenas últimos 90 dias de logs
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_logs
    WHERE sent_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_notification_logs IS 
'Remove logs de notificações com mais de 90 dias. Executar mensalmente via cron.';
