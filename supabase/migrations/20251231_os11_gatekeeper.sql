-- OS-11: Gatekeeper Flexível - Migração de Banco de Dados (CORRIGIDO)
-- Executar no SQL Editor do Supabase
-- Data: 2025-12-31
-- Responsável: Squad Backend

-- ============================================================================
-- 1. ADICIONAR COLUNAS DE ASSINATURA
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS usage_stats JSONB DEFAULT '{"text": 0, "image": 0, "audio": 0, "last_date": null}'::jsonb;

-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para queries por status de assinatura
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status);

-- Índice para queries de vencimento de trial
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at 
ON profiles(trial_ends_at) 
WHERE subscription_status = 'trial';

-- Índice GIN para queries em JSONB (usage_stats)
CREATE INDEX IF NOT EXISTS idx_profiles_usage_stats 
ON profiles USING GIN (usage_stats);

-- ============================================================================
-- 3. CONSTRAINTS E VALIDAÇÕES
-- ============================================================================

-- Remove constraint antiga se existir para evitar erro de duplicação
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_subscription_status;

-- Validar valores permitidos para subscription_status
ALTER TABLE profiles 
ADD CONSTRAINT check_subscription_status 
CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));

-- Garantir que stripe_customer_id seja único (quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id 
ON profiles(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN profiles.subscription_status IS 
'Status da assinatura: trial (teste 7 dias), active (pagante), expired (vencido), cancelled (cancelado)';

COMMENT ON COLUMN profiles.trial_ends_at IS 
'Data de término do período de teste gratuito (7 dias após cadastro)';

COMMENT ON COLUMN profiles.stripe_customer_id IS 
'ID do cliente no Stripe para gerenciamento de billing e pagamentos';

COMMENT ON COLUMN profiles.usage_stats IS 
'Estatísticas de uso diário em formato JSONB flexível. Estrutura: {"text": 0, "image": 0, "audio": 0, "last_date": "YYYY-MM-DD"}';

-- ============================================================================
-- 5. ATUALIZAR USUÁRIOS EXISTENTES
-- ============================================================================

-- Garantir que todos os usuários existentes tenham trial de 7 dias
UPDATE profiles 
SET 
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '7 days',
  usage_stats = '{"text": 0, "image": 0, "audio": 0, "last_date": null}'::jsonb
WHERE subscription_status IS NULL;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - CORRIGIDO
-- ============================================================================

-- Derruba as políticas antigas se existirem (para evitar erro ao recriar)
DROP POLICY IF EXISTS "Users can view own subscription data" ON profiles;
DROP POLICY IF EXISTS "Service role can update usage stats" ON profiles;

-- Recria as políticas
CREATE POLICY "Users can view own subscription data"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Service role can update usage stats"
ON profiles FOR UPDATE
USING (auth.role() = 'service_role');

-- ============================================================================
-- 7. FUNÇÃO AUXILIAR: RESET DIÁRIO AUTOMÁTICO
-- ============================================================================

-- Função para resetar contadores (pode ser chamada por cron job)
CREATE OR REPLACE FUNCTION reset_daily_usage_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET usage_stats = jsonb_set(
    jsonb_set(
      jsonb_set(
        usage_stats,
        '{text}', '0'
      ),
      '{image}', '0'
    ),
    '{audio}', '0'
  )
  WHERE (usage_stats->>'last_date')::date < CURRENT_DATE;
  
  RAISE NOTICE 'Daily usage stats reset completed';
END;
$$;

-- ============================================================================
-- 8. FUNÇÃO AUXILIAR: EXPIRAR TRIALS VENCIDOS
-- ============================================================================

-- Função para marcar trials vencidos como expired (pode ser chamada por cron job)
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE profiles
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial'
  AND trial_ends_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RAISE NOTICE 'Expired % trial subscriptions', expired_count;
END;
$$;

-- ============================================================================
-- 9. VERIFICAÇÃO DE INTEGRIDADE
-- ============================================================================

-- Query para verificar se a migração foi bem-sucedida
DO $$
DECLARE
  total_users INTEGER;
  trial_users INTEGER;
  active_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM profiles;
  SELECT COUNT(*) INTO trial_users FROM profiles WHERE subscription_status = 'trial';
  SELECT COUNT(*) INTO active_users FROM profiles WHERE subscription_status = 'active';
  
  RAISE NOTICE '=== MIGRAÇÃO OS-11 CONCLUÍDA ===';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Usuários em trial: %', trial_users;
  RAISE NOTICE 'Usuários ativos: %', active_users;
  RAISE NOTICE 'Índices criados: 4';
  RAISE NOTICE 'Políticas RLS: 2';
  RAISE NOTICE 'Funções auxiliares: 2';
END;
$$;
