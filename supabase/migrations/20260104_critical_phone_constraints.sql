-- Migration: Phone Number Uniqueness and Integrity Constraints
-- Date: 2026-01-04
-- Critical: Prevents user identity confusion and data leaks

-- ============================================
-- PASSO 1: LIMPEZA DE DADOS EXISTENTES
-- ============================================

-- 1.1. Reportar registros problemáticos
DO $$
DECLARE
    null_count INTEGER;
    invalid_count INTEGER;
    duplicate_count INTEGER;
BEGIN
    -- Contar telefones NULL
    SELECT COUNT(*) INTO null_count FROM profiles WHERE phone IS NULL;
    RAISE NOTICE '📊 Telefones NULL encontrados: %', null_count;
    
    -- Contar telefones inválidos (< 10 dígitos)
    SELECT COUNT(*) INTO invalid_count FROM profiles WHERE phone IS NOT NULL AND length(phone) < 10;
    RAISE NOTICE '📊 Telefones inválidos encontrados: %', invalid_count;
    
    -- Contar duplicatas
    SELECT COUNT(*) INTO duplicate_count FROM (
        SELECT phone FROM profiles 
        WHERE phone IS NOT NULL 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    ) AS duplicates;
    RAISE NOTICE '📊 Telefones duplicados encontrados: %', duplicate_count;
END $$;

-- 1.2. OPÇÃO A: Deletar registros sem telefone válido (CUIDADO!)
-- Descomente apenas se tiver certeza que esses registros são inválidos
-- DELETE FROM profiles WHERE phone IS NULL OR length(phone) < 10;

-- 1.3. OPÇÃO B: Atualizar com telefone temporário (RECOMENDADO)
-- Gera telefone único temporário para registros inválidos
UPDATE profiles 
SET phone = '5500000' || LPAD(id::text, 8, '0')
WHERE phone IS NULL OR length(phone) < 10;

-- 1.4. Resolver duplicatas (manter o mais recente)
DO $$
DECLARE
    duplicate_phone TEXT;
    oldest_id UUID;
BEGIN
    FOR duplicate_phone IN 
        SELECT phone 
        FROM profiles 
        WHERE phone IS NOT NULL 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    LOOP
        -- Encontrar o ID mais antigo (será deletado)
        SELECT id INTO oldest_id
        FROM profiles 
        WHERE phone = duplicate_phone
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Atualizar telefone do mais antigo para temporário
        UPDATE profiles 
        SET phone = '5599999' || LPAD(oldest_id::text, 8, '0')
        WHERE id = oldest_id;
        
        RAISE NOTICE '⚠️ Duplicata resolvida: % (ID antigo: %)', duplicate_phone, oldest_id;
    END LOOP;
END $$;

-- ============================================
-- PASSO 2: APLICAR CONSTRAINTS
-- ============================================

-- 2.1. GARANTIR UNICIDADE
ALTER TABLE profiles 
ADD CONSTRAINT unique_phone UNIQUE (phone);

-- 2.2. GARANTIR INTEGRIDADE
ALTER TABLE profiles 
ADD CONSTRAINT phone_not_empty 
CHECK (phone IS NOT NULL AND length(phone) >= 10);

-- ============================================
-- PASSO 3: ÍNDICES E DOCUMENTAÇÃO
-- ============================================

-- 3.1. ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_phone 
ON profiles(phone) 
WHERE phone IS NOT NULL;

-- 3.2. COMENTÁRIOS
COMMENT ON CONSTRAINT unique_phone ON profiles IS 
'Garante que cada número de telefone seja único no sistema. Previne confusão de identidade entre usuários.';

COMMENT ON CONSTRAINT phone_not_empty ON profiles IS 
'Garante que o telefone tenha pelo menos 10 dígitos. Formato esperado: 5511999999999 (DDI + DDD + Número).';

-- ============================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ============================================
DO $$
BEGIN
    -- Verificar se constraints foram aplicadas
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_phone' 
        AND conrelid = 'profiles'::regclass
    ) THEN
        RAISE NOTICE '✅ Constraint unique_phone aplicada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ ERRO: Constraint unique_phone não foi aplicada';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'phone_not_empty' 
        AND conrelid = 'profiles'::regclass
    ) THEN
        RAISE NOTICE '✅ Constraint phone_not_empty aplicada com sucesso';
    ELSE
        RAISE EXCEPTION '❌ ERRO: Constraint phone_not_empty não foi aplicada';
    END IF;
    
    RAISE NOTICE '🎉 Migration concluída com sucesso!';
END $$;

