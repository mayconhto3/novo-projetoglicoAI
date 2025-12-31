
export enum DiabetesType {
  Type1 = 'Tipo 1',
  Type2 = 'Tipo 2',
  Gestational = 'Gestacional',
  Prediabetes = 'Pré-diabetes',
  Unknown = 'Não sei'
}

export enum Gender {
  Male = 'Masculino',
  Female = 'Feminino',
  Other = 'Outro',
  PreferNotToSay = 'Prefiro não dizer'
}

export interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
}

export interface Reminder {
  id: string;
  title: string;
  time: string; // HH:MM
  type: 'insulin' | 'meal' | 'measurement' | 'medication' | 'water' | 'other';
  active: boolean;
}

export interface Meal {
  id: string;
  user_id: string;
  created_at: string;
  meal_time: string; // 'Café', 'Almoço', etc
  description: string;
  image_url?: string;
  carbs: number;
  calories?: number;
  insulin_suggested?: number;
  insulin_taken?: number;
  glucose_pre?: number;
  glucose_post?: number;
  ai_feedback?: string;
  favorite: boolean;
}

export interface InsulinRecord {
  id: string;
  user_id: string;
  created_at: string;
  insulin_type: 'Basal' | 'Bolus' | 'Correção';
  context: string; // 'Café', 'Almoço', 'Rotina', etc.
  insulin_brand?: string;
  units: number;
  related_meal_id?: string;
  glucose_before?: number;
  glucose_target?: number;
  isf?: number;
  calculation_note?: string;
  note?: string;
}

export interface NotificationSettings {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  medication: boolean;
  glucoseCheck: boolean;
  whatsapp: boolean;
}

export interface UserProfile {
  // SEÇÃO 1: IDENTIFICAÇÃO E CONTATO
  name: string;
  birthDate: string;
  gender: Gender;
  phone: string;
  email: string;
  weight: number;
  height: number;

  // SEÇÃO 2: DIAGNÓSTICO E HISTÓRICO
  diabetesType: DiabetesType;
  diagnosisYear: number;
  hba1c?: number;
  hba1cDate?: string;

  // SEÇÃO 3: TRATAMENTO COM INSULINA
  usesInsulin: boolean;
  insulinDuration?: number; // Duração da ação (DIA) em horas (ex: 3, 4, 5)
  insulinMethod?: 'Caneta' | 'Seringa' | 'Bomba'; // OS-08: Método de aplicação
  insulinStep?: 1.0 | 0.5; // OS-08: Precisão da dose (1u padrão, 0.5u pediátrico)
  basalInsulin?: {
    uses: boolean;
    brand?: string;
    morningDose?: number;
    morningTime?: string;
    nightDose?: number;
    nightTime?: string;
  };
  bolusInsulin?: {
    uses: boolean;
    brand?: string;
  };

  // SEÇÃO 4: PARÂMETROS PERSONALIZADOS
  knowsICRatio: boolean;
  icRatioBreakfast?: number; // 1:X
  icRatioLunch?: number;
  icRatioDinner?: number;
  icRatioSnack?: number;

  knowsISF: boolean;
  isfMorning?: number; // 1u lowers X mg/dL
  isfAfternoon?: number;
  isfEvening?: number;

  totalDailyDose?: number; // Helper for auto-calc

  targetGlucosePreMeal: number;
  targetGlucosePostMeal: number;
  targetsDefinedByDoctor: boolean;

  // SEÇÃO 5: ROTINA DE MONITORAMENTO
  measurementFrequency: string;
  usesCGM: boolean;
  cgmModel?: string;
  cgmIntegration?: boolean;

  // SEÇÃO 5.3: HISTÓRICO DE EPISÓDIOS
  hypoglycemiaFrequency?: string;
  hypoglycemiaSymptoms?: string[];
  hyperglycemiaFrequency?: string;
  hyperglycemiaSymptoms?: string[];

  // SEÇÃO 6: HORÁRIOS E ROTINA ALIMENTAR
  mealTimes: {
    breakfast: string;
    snackMorning?: string;
    lunch: string;
    snackAfternoon?: string;
    dinner: string;
    supper?: string;
  };
  routineVariability?: 'Fixa' | 'Varia Pouco' | 'Varia Muito';
  dietType?: string[];
  carbCountingKnowledge?: 'Sempre' | 'Às vezes' | 'Não sei' | 'Nunca';
  problematicFoods?: string[];

  // SEÇÃO 7: ESTILO DE VIDA
  exerciseFrequency: string;
  exerciseType?: string[];
  exerciseTime?: string;
  exerciseDuration?: number; // minutes

  smoker: string;
  alcoholConsumption: string;
  stressLevel: string;
  sleepQuality: string;

  // SEÇÃO 8: MEDICAMENTOS E COMORBIDADES
  otherDiabetesMedications?: Medication[];
  comorbidities?: string[];
  medicationsAffectingGlucose?: string[]; // Corticoides etc

  // SEÇÃO 9: ACOMPANHAMENTO MÉDICO
  hasEndocrinologist: boolean;
  consultationFrequency?: string;
  hasNutritionist: boolean;
  doctorName?: string;
  doctorEmail?: string;
  treatmentGoals: string[];

  // SEÇÃO 10: PREFERÊNCIAS DO ASSISTENTE
  reminders: string[];
  notificationSettings?: NotificationSettings; // NOVA PROPRIEDADE
  checkInFrequency: string;
  communicationStyle: 'Direto' | 'Amigável' | 'Educativo' | 'Misto';

  caregiver?: {
    active: boolean;
    name: string;
    phone: string;
    relation: string;
    permissions: string[];
  };

  // SEÇÃO 11: CONSENTIMENTO
  termsAccepted: boolean;
  medicalDisclaimerAccepted: boolean;
  dataProcessingConsent: boolean;
  doctorSharingConsent: boolean;
}

export interface GlucoseReading {
  id: string;
  value: number; // mg/dL
  timestamp: Date;
  type: 'Fasting' | 'Pre-Meal' | 'Post-Meal' | 'Correction';
}

export interface Insight {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 string
  audio?: string; // base64 string for audio
  timestamp: Date;
}

// ============================================================================
// GAMIFICATION TYPES
// ============================================================================

// Mapeia para a tabela user_gamification (dados agregados - 1 linha por usuário)
export interface UserGamification {
  id: string;
  user_id: string;
  level: number;
  xp: number;              // XP atual no nível corrente
  total_xp: number;        // XP total acumulado
  streak_days: number;
  longest_streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

// Mapeia para a tabela user_achievements existente (badges individuais)
export interface UserAchievement {
  id: string;
  user_id: string;
  badge_id: string;
  badge_name: string;
  xp_earned: number;       // XP ganho ao desbloquear
  unlocked_at: string;
  created_at: string;
}

// Definição de badge
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: BadgeCriteria;
}

export interface BadgeCriteria {
  type: 'streak' | 'count' | 'tir' | 'level' | 'profile';
  target: number;
  current?: number;
}

// Tarefas de completamento de perfil
export interface ProfileCompletionTask {
  id: string;
  user_id: string;
  task_key: ProfileTaskKey;
  completed: boolean;
  completed_at: string | null;
  xp_awarded: number;
  created_at: string;
}

export type ProfileTaskKey =
  | 'basic_info'           // Nome, tipo diabetes (FEITO no quick questionnaire)
  | 'insulin_details'      // Marcas, doses, horários
  | 'meal_schedule'        // Horários das refeições
  | 'lifestyle_habits'     // Exercícios, sono, stress
  | 'medical_team'         // Endócrino, nutricionista
  | 'emergency_contact'    // Cuidador/familiar
  | 'monitoring_setup'     // CGM, frequência de medição
  | 'diet_preferences';    // Tipo de dieta, contagem de carbos

export interface ProfileTaskMetadata {
  key: ProfileTaskKey;
  title: string;
  description: string;
  xp_reward: number;
  icon: string;
  priority: number; // Ordem de exibição
  fields: string[]; // Campos do UserProfile relacionados
}
