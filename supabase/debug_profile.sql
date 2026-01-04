-- Debug: Verificar estrutura do perfil do usuário
-- Execute este SQL no Supabase Dashboard para ver seus dados

SELECT 
    id,
    name,
    phone,
    email,
    -- Campos SQL diretos
    target_glucose_min,
    target_glucose_max,
    -- JSON completo
    medical_data,
    -- Campos específicos do JSON
    medical_data->>'usesInsulin' as uses_insulin_json,
    medical_data->'basalInsulin'->>'uses' as basal_uses,
    medical_data->'basalInsulin'->>'brand' as basal_brand,
    medical_data->'basalInsulin'->>'morningDose' as morning_dose,
    medical_data->'basalInsulin'->>'nightDose' as night_dose,
    created_at,
    updated_at
FROM profiles
WHERE email = 'SEU_EMAIL_AQUI'  -- Substitua pelo seu email
LIMIT 1;

-- Se não souber o email, liste todos:
-- SELECT id, name, email, phone FROM profiles;
