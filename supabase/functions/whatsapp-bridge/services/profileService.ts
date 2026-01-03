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

    // OS-18: Dados do questionário para contexto da IA
    mealTimes?: {
        breakfast?: string;
        lunch?: string;
        dinner?: string;
    };
    hypoHistory?: 'never' | 'rare' | 'sometimes' | 'frequent';
    hyperHistory?: 'never' | 'rare' | 'sometimes' | 'frequent';
    hypoSymptoms?: string[];
    diabetesMeds?: string[];
    glycemicMeds?: string[];
    diet?: string;
    problematicFoods?: string[];
    countCarbs?: 'always' | 'sometimes' | 'never';
    exercise?: string;
    smoking?: string;
    alcohol?: string;
    sleepQuality?: string;

    // Campos legados (manter compatibilidade)
    hypoglycemiaFrequency?: string;
    hypoglycemiaSymptoms?: string[];
    comorbidities?: string[];
    dietType?: string[];
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

// ============================================================================
// OS-18: AI CONTEXT ENRICHMENT HELPERS
// ============================================================================

/**
 * Calcula idade a partir da data de nascimento
 */
export function calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

/**
 * Constrói contexto clínico compactado para a IA
 * OS-18: Injeta dados do questionário que estavam sendo ignorados
 */
export function buildClinicalContext(profile: UserProfile): string {
    const sections: string[] = [];

    // 🚨 SEGURANÇA CRÍTICA
    if (profile.hypoSymptoms && profile.hypoSymptoms.length > 0) {
        sections.push(`⚠️ SINTOMAS HIPO CONHECIDOS: ${profile.hypoSymptoms.join(', ')}`);
    }

    if (profile.hypoHistory === 'frequent') {
        sections.push(`⚠️ HISTÓRICO: Hipoglicemias FREQUENTES - seja conservador nas doses`);
    }

    // 💊 MEDICAMENTOS
    const meds: string[] = [];
    if (profile.diabetesMeds && profile.diabetesMeds.length > 0) {
        meds.push(`Orais: ${profile.diabetesMeds.join(', ')}`);
    }
    if (profile.glycemicMeds && profile.glycemicMeds.length > 0) {
        meds.push(`⚠️ Afetam glicemia: ${profile.glycemicMeds.join(', ')}`);
    }
    if (meds.length > 0) {
        sections.push(`💊 MEDICAMENTOS: ${meds.join(' | ')}`);
    }

    // 🏥 COMORBIDADES
    if (profile.comorbidities && profile.comorbidities.length > 0) {
        sections.push(`🏥 COMORBIDADES: ${profile.comorbidities.join(', ')}`);
    }

    // 🍽️ ALIMENTAÇÃO
    const foodContext: string[] = [];
    if (profile.diet && profile.diet !== 'Padrão') {
        foodContext.push(`Dieta: ${profile.diet}`);
    }
    if (profile.problematicFoods && profile.problematicFoods.length > 0) {
        foodContext.push(`Evita: ${profile.problematicFoods.join(', ')}`);
    }
    if (foodContext.length > 0) {
        sections.push(`🍽️ ALIMENTAÇÃO: ${foodContext.join(' | ')}`);
    }

    // 🏃 ESTILO DE VIDA
    const lifestyle: string[] = [];
    if (profile.exercise && profile.exercise !== 'none') {
        lifestyle.push(`Exercício: ${profile.exercise}`);
    }
    if (profile.alcohol && profile.alcohol !== 'no') {
        lifestyle.push(`⚠️ Álcool: ${profile.alcohol} (risco hipo tardia)`);
    }
    if (profile.sleepQuality === 'poor') {
        lifestyle.push(`⚠️ Sono ruim (↑ resistência insulina)`);
    }
    if (lifestyle.length > 0) {
        sections.push(`🏃 ESTILO: ${lifestyle.join(' | ')}`);
    }

    // 👤 PERFIL
    const age = profile.birthDate ? calculateAge(profile.birthDate) : null;
    const yearsWithDiabetes = profile.diagnosisYear ? new Date().getFullYear() - profile.diagnosisYear : null;

    if (age || yearsWithDiabetes) {
        const profileInfo: string[] = [];
        if (age) profileInfo.push(`${age} anos`);
        if (yearsWithDiabetes) profileInfo.push(`${yearsWithDiabetes} anos com diabetes`);
        sections.push(`👤 PERFIL: ${profileInfo.join(', ')}`);
    }

    return sections.length > 0 ? sections.join('\n') : '';
}

/**
 * Infere horário de refeição baseado nas preferências do usuário
 * OS-18 FASE 1: Corrige lógica hardcoded
 */
export function inferMealTime(timestamp: Date, profile: UserProfile): string {
    const hour = timestamp.getHours();

    // Usar horários personalizados se disponíveis
    if (profile.mealTimes) {
        const breakfastHour = profile.mealTimes.breakfast ? parseInt(profile.mealTimes.breakfast.split(':')[0]) : 8;
        const lunchHour = profile.mealTimes.lunch ? parseInt(profile.mealTimes.lunch.split(':')[0]) : 12;
        const dinnerHour = profile.mealTimes.dinner ? parseInt(profile.mealTimes.dinner.split(':')[0]) : 19;

        // Lógica dinâmica baseada nas preferências
        if (hour >= breakfastHour - 1 && hour < lunchHour - 1) return 'Café';
        if (hour >= lunchHour - 1 && hour < dinnerHour - 1) return 'Almoço';
        if (hour >= dinnerHour - 1 && hour < 23) return 'Jantar';
        return 'Lanche';
    }

    // Fallback: lógica padrão (compatibilidade)
    if (hour >= 6 && hour < 10) return 'Café';
    if (hour >= 10 && hour < 12) return 'Lanche da Manhã';
    if (hour >= 12 && hour < 15) return 'Almoço';
    if (hour >= 15 && hour < 18) return 'Lanche da Tarde';
    if (hour >= 18 && hour < 21) return 'Jantar';
    return 'Ceia';
}
