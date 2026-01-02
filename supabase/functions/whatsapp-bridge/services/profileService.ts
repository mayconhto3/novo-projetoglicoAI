// Especialista em Perfil de Usuário
// Responsabilidade: Buscar e validar perfil do usuário

export interface UserProfile {
    id?: string; // User ID (opcional para compatibilidade)
    name: string;
    birthDate: string;
    gender: string;
    phone: string;
    weight: number;
    height: number;
    diabetesType: string;
    diagnosisYear: number;
    hba1c?: number;
    usesInsulin: boolean;
    insulinDuration?: number;
    insulinMethod?: 'Caneta' | 'Seringa' | 'Bomba'; // OS-09: Método de aplicação
    insulinStep?: 1.0 | 0.5; // OS-09: Precisão da dose
    basalInsulin?: {
        brand?: string;
        morningDose?: number;
        morningTime?: string;
        nightDose?: number;
        nightTime?: string;
    };
    bolusInsulin?: { brand?: string };
    icRatioBreakfast?: number;
    icRatioLunch?: number;
    icRatioDinner?: number;
    icRatioSnack?: number;
    isfMorning?: number;
    targetGlucosePreMeal: number;
    targetGlucosePostMeal: number;
    hypoglycemiaFrequency?: string;
    hypoglycemiaSymptoms?: string[];
    comorbidities?: string[];
    dietType?: string[];
    problematicFoods?: string[];
    carbCountingKnowledge?: string;
    exerciseFrequency: string;
    exerciseType?: string[];
    smoker: string;
    alcoholConsumption: string;
    medicationsAffectingGlucose?: string[];
    communicationStyle: string;
    caregiver?: { active: boolean; name: string };

    // OS-11: Gatekeeper & Subscription
    subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled';
    trial_ends_at?: string;
    stripe_customer_id?: string;
    usage_stats?: {
        text: number;
        image: number;
        audio: number;
        last_date: string | null;
    };
}

export interface UserProfileResult {
    id: string;
    profile: UserProfile;
}

/**
 * Busca perfil de usuário por número de telefone
 * 
 * Estratégia:
 * 1. Tenta RPC otimizada (get_profile_by_phone)
 * 2. Fallback: Busca manual em profiles
 * 
 * @param supabase - Cliente Supabase
 * @param phoneNumber - Número de telefone limpo (apenas dígitos)
 * @returns Perfil do usuário ou null se não encontrado
 */
export async function findUserProfile(
    supabase: any,
    phoneNumber: string
): Promise<UserProfileResult | null> {
    console.log(`[ProfileService] Buscando usuário: ${phoneNumber}`);

    // 1. Tenta buscar pela RPC otimizada
    let { data: users, error } = await supabase.rpc("get_profile_by_phone", {
        phone_number: phoneNumber,
    });

    if (error) {
        console.warn("[ProfileService] Erro na RPC get_profile_by_phone:", error);
    }

    // 2. Fallback: Busca manual se a RPC falhar
    if (!users || users.length === 0) {
        console.log("[ProfileService] RPC vazia, tentando busca manual...");
        const { data: allUsers } = await supabase.from("profiles").select("*");

        if (allUsers) {
            users = allUsers.filter((u: any) => {
                const dbPhone = (u.medical_data?.phone || "").replace(/\D/g, "");
                return dbPhone.endsWith(phoneNumber) || phoneNumber.endsWith(dbPhone);
            });
        }
    }

    if (!users || users.length === 0) {
        console.log("[ProfileService] Usuário não encontrado");
        return null;
    }

    console.log(`[ProfileService] Usuário encontrado: ${users[0].id}`);

    // ============================================================================
    // CRITICAL FIX: Merge medical_data with OS-11 direct columns
    // ============================================================================
    // OS-11 columns are DIRECT in profiles table, not in medical_data JSONB:
    // - subscription_status
    // - trial_ends_at
    // - stripe_customer_id
    // - usage_stats

    const profileData: UserProfile = {
        ...(users[0].medical_data || {}),  // Spread medical_data first
        id: users[0].id,                    // Override with direct columns
        subscription_status: users[0].subscription_status,
        trial_ends_at: users[0].trial_ends_at,
        stripe_customer_id: users[0].stripe_customer_id,
        usage_stats: users[0].usage_stats
    };

    console.log(`[ProfileService] Profile montado com OS-11 fields:`, {
        id: profileData.id,
        subscription_status: profileData.subscription_status,
        trial_ends_at: profileData.trial_ends_at,
        has_usage_stats: !!profileData.usage_stats
    });

    return {
        id: users[0].id,
        profile: profileData,
    };
}
