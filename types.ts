
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
