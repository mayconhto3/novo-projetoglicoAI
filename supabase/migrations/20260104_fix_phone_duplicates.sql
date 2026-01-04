-- Script: Resolver Duplicatas de Telefone
-- Data: 2026-01-04
-- Executar APENAS se já aplicou o critical_phone_constraints.sql

-- ============================================
-- RESOLVER DUPLICATAS EXISTENTES
-- ============================================

DO $$
DECLARE
    duplicate_phone TEXT;
    oldest_id UUID;
    duplicate_count INTEGER := 0;
BEGIN
    -- Contar duplicatas
    SELECT COUNT(*) INTO duplicate_count FROM (
        SELECT phone FROM profiles 
        WHERE phone IS NOT NULL 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    ) AS duplicates;
    
    RAISE NOTICE '📊 Telefones duplicados encontrados: %', duplicate_count;
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✅ Nenhuma duplicata encontrada! Banco de dados está limpo.';
        RETURN;
    END IF;
    
    -- Resolver cada duplicata
    FOR duplicate_phone IN 
        SELECT phone 
        FROM profiles 
        WHERE phone IS NOT NULL 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    LOOP
        -- Encontrar o ID mais antigo (será atualizado)
        SELECT id INTO oldest_id
        FROM profiles 
        WHERE phone = duplicate_phone
        ORDER BY created_at ASC
        LIMIT 1;
        
        -- Atualizar telefone do mais antigo para temporário único
        UPDATE profiles 
        SET phone = '5599999' || LPAD(oldest_id::text, 8, '0')
        WHERE id = oldest_id;
        
        RAISE NOTICE '⚠️ Duplicata resolvida: % (ID antigo atualizado: %)', duplicate_phone, oldest_id;
    END LOOP;
    
    RAISE NOTICE '🎉 Todas as duplicatas foram resolvidas!';
END $$;

-- Verificar resultado
SELECT 
    phone, 
    COUNT(*) as quantidade,
    array_agg(id) as ids
FROM profiles 
WHERE phone IS NOT NULL
GROUP BY phone 
HAVING COUNT(*) > 1;

-- Se não retornar nada, está tudo OK!
