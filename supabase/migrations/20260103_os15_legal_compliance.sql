-- OS-15: Legal Compliance - Migração de Banco de Dados
-- Executar no SQL Editor do Supabase
-- Data: 2026-01-03
-- Responsável: Squad Fullstack
-- Prioridade: ALTA (Bloqueante para Lançamento)

-- ============================================================================
-- 1. ADICIONAR COLUNAS DE COMPLIANCE
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS medical_disclaimer_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_consent_accepted BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 2. ÍNDICES PARA AUDITORIA
-- ============================================================================

-- Índice para queries de auditoria (usuários que aceitaram termos)
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted 
ON profiles(terms_accepted_at) 
WHERE terms_accepted_at IS NOT NULL;

-- Índice para identificar usuários sem aceite (precisam onboarding)
CREATE INDEX IF NOT EXISTS idx_profiles_pending_terms 
ON profiles(id) 
WHERE terms_accepted_at IS NULL;

-- ============================================================================
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN profiles.terms_accepted_at IS 
'Timestamp exato do aceite dos termos. NULL = usuário precisa aceitar. Usado para auditoria LGPD.';

COMMENT ON COLUMN profiles.terms_version IS 
'Versão dos termos aceitos (v1.0, v2.0, etc). Permite forçar novo aceite ao atualizar termos.';

COMMENT ON COLUMN profiles.medical_disclaimer_accepted IS 
'Aceite do disclaimer médico: "GlucoAI não é médico, apenas ferramenta educativa". Proteção contra processos.';

COMMENT ON COLUMN profiles.privacy_policy_accepted IS 
'Aceite da Política de Privacidade e coleta de dados de saúde conforme LGPD Art. 7º.';

COMMENT ON COLUMN profiles.whatsapp_consent_accepted IS 
'Consentimento informado sobre uso do WhatsApp/Meta. Transfere responsabilidade de vazamento da Meta.';

-- ============================================================================
-- 4. FUNÇÃO AUXILIAR: VERIFICAR COMPLIANCE
-- ============================================================================

-- Função para verificar se usuário está em compliance
CREATE OR REPLACE FUNCTION check_user_compliance(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_compliant BOOLEAN;
BEGIN
  SELECT 
    terms_accepted_at IS NOT NULL 
    AND medical_disclaimer_accepted = TRUE
    AND privacy_policy_accepted = TRUE
    AND whatsapp_consent_accepted = TRUE
  INTO is_compliant
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_compliant, FALSE);
END;
$$;

-- ============================================================================
-- 5. FUNÇÃO AUXILIAR: LISTAR USUÁRIOS SEM COMPLIANCE
-- ============================================================================

-- Função para admin identificar usuários que precisam aceitar termos
CREATE OR REPLACE FUNCTION get_users_pending_compliance()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  days_since_creation INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.created_at,
    EXTRACT(DAY FROM (NOW() - p.created_at))::INTEGER
  FROM profiles p
  WHERE p.terms_accepted_at IS NULL
  ORDER BY p.created_at DESC;
END;
$$;

-- ============================================================================
-- 6. VERIFICAÇÃO DE INTEGRIDADE
-- ============================================================================

-- Query para verificar se a migração foi bem-sucedida
DO $$
DECLARE
  total_users INTEGER;
  compliant_users INTEGER;
  pending_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  SELECT COUNT(*) INTO compliant_users 
  FROM profiles 
  WHERE terms_accepted_at IS NOT NULL;
  
  SELECT COUNT(*) INTO pending_users 
  FROM profiles 
  WHERE terms_accepted_at IS NULL;
  
  RAISE NOTICE '=== MIGRAÇÃO OS-15 CONCLUÍDA ===';
  RAISE NOTICE 'Total de usuários: %', total_users;
  RAISE NOTICE 'Usuários em compliance: %', compliant_users;
  RAISE NOTICE 'Usuários pendentes: %', pending_users;
  RAISE NOTICE 'Índices criados: 2';
  RAISE NOTICE 'Funções auxiliares: 2';
  RAISE NOTICE '====================================';
END;
$$;

-- ============================================================================
-- 7. EXEMPLO DE USO (TESTES)
-- ============================================================================

-- Testar função de compliance
-- SELECT check_user_compliance('user-id-aqui');

-- Listar usuários pendentes
-- SELECT * FROM get_users_pending_compliance();

-- Verificar colunas criadas
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- AND column_name LIKE '%accept%';
