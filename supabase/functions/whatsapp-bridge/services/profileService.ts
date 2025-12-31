// Especialista em Perfil de Usuário
// Responsabilidade: Buscar e validar perfil do usuário

export interface UserProfile {
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

    return {
        id: users[0].id,
        profile: users[0].medical_data as UserProfile,
    };
}
