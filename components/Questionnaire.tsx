import React, { useState } from 'react';
import { UserProfile, DiabetesType, Gender, Medication } from '../types';
import { ChevronRight, ChevronLeft, Check, AlertCircle, Heart, Activity, Clock, ShieldCheck, UserCog, Utensils, Stethoscope, Bell, Syringe } from 'lucide-react';

interface QuestionnaireProps {
    onComplete: (profile: UserProfile) => void;
}

const initialProfile: UserProfile = {
    // 1
    name: '',
    birthDate: '',
    gender: Gender.PreferNotToSay,
    phone: '',
    email: '',
    weight: 0,
    height: 0,
    // 2
    diabetesType: DiabetesType.Unknown,
    diagnosisYear: new Date().getFullYear(),
    // 3
    usesInsulin: false,
    insulinDuration: 4, // Default standard 4 hours
    // 4
    knowsICRatio: false,
    knowsISF: false,
    targetGlucosePreMeal: 100,
    targetGlucosePostMeal: 140,
    targetsDefinedByDoctor: false,
    // 5
    measurementFrequency: '3-4 vezes/dia',
    usesCGM: false,
    // 6
    mealTimes: {
        breakfast: '08:00',
        lunch: '12:00',
        dinner: '19:00'
    },
    // 7
    exerciseFrequency: 'Não pratico',
    smoker: 'Não',
    alcoholConsumption: 'Não',
    stressLevel: 'Moderado',
    sleepQuality: 'Durmo bem',
    // 8
    otherDiabetesMedications: [],
    comorbidities: [],
    medicationsAffectingGlucose: [],
    // 9
    hasEndocrinologist: false,
    hasNutritionist: false,
    treatmentGoals: [],
    // 10
    reminders: [],
    checkInFrequency: 'A cada refeição',
    communicationStyle: 'Amigável',
    caregiver: { active: false, name: '', phone: '', relation: '', permissions: [] },
    // 11
    termsAccepted: false,
    medicalDisclaimerAccepted: false,
    dataProcessingConsent: false,
    doctorSharingConsent: false
};

export const Questionnaire: React.FC<QuestionnaireProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<UserProfile>(initialProfile);
    const [tempBasalTotal, setTempBasalTotal] = useState(0);
    const [tempBolusTotal, setTempBolusTotal] = useState(0);

    const totalSteps = 11;

    // Auto-preencher Total Basal quando chegar no Step 4
    React.useEffect(() => {
        // Quando chegar no passo 4 (Parâmetros)
        if (step === 4 && formData.usesInsulin) {
            const basal = formData.basalInsulin;
            const morning = basal?.morningDose || 0;
            const night = basal?.nightDose || 0;

            const total = morning + night;

            // Só auto-preenche se tiver valor e o campo ainda estiver zerado
            if (total > 0 && tempBasalTotal === 0) {
                setTempBasalTotal(total);
            }
        }
    }, [step, formData.usesInsulin, formData.basalInsulin, tempBasalTotal]);

    const handleChange = (field: keyof UserProfile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent: keyof UserProfile, key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...(prev[parent] as object),
                [key]: value
            }
        }));
    };

    const toggleArrayItem = (field: keyof UserProfile, item: string) => {
        setFormData(prev => {
            const arr = (prev[field] as string[]) || [];
            if (arr.includes(item)) {
                return { ...prev, [field]: arr.filter(i => i !== item) };
            } else {
                return { ...prev, [field]: [...arr, item] };
            }
        });
    };

    const handleNext = () => {
        // Basic validations
        if (step === 1 && (!formData.name || !formData.phone)) return alert("Nome e Telefone são obrigatórios.");
        if (step === 2 && !formData.diabetesType) return alert("Tipo de diabetes é obrigatório.");

        if (step === totalSteps) {
            if (!formData.termsAccepted || !formData.medicalDisclaimerAccepted || !formData.dataProcessingConsent) {
                return alert("Você precisa aceitar os consentimentos obrigatórios para continuar.");
            }
            calculateParameters();
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => setStep(prev => prev - 1);

    const calculateParameters = () => {
        let finalProfile = { ...formData };

        // --- LÓGICA DE NORMALIZAÇÃO DO TELEFONE PARA VINCULAR COM WHATSAPP ---
        if (finalProfile.phone) {
            // Remove tudo que não é dígito
            let cleanPhone = finalProfile.phone.replace(/\D/g, '');

            // Se o usuário digitou apenas DDD + Número (Ex: 31999999999 - 11 dígitos)
            // Adicionamos o 55 (Brasil) automaticamente para bater com o padrão do WhatsApp
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                cleanPhone = '55' + cleanPhone;
            }

            finalProfile.phone = cleanPhone;
        }
        // ---------------------------------------------------------------------

        let tdd = 0;

        if (formData.usesInsulin) {
            // Fallback calculation if needed
            if (!formData.knowsICRatio || !formData.knowsISF) {
                tdd = tempBasalTotal + tempBolusTotal;
            }

            // Regra dos 500
            if (!formData.knowsICRatio && tdd > 0) {
                const calculatedIC = Math.round(500 / tdd);
                finalProfile.icRatioBreakfast = calculatedIC;
                finalProfile.icRatioLunch = calculatedIC;
                finalProfile.icRatioDinner = calculatedIC;
                finalProfile.icRatioSnack = calculatedIC;
            }

            // Regra dos 1800
            if (!formData.knowsISF && tdd > 0) {
                const calculatedISF = Math.round(1800 / tdd);
                finalProfile.isfMorning = calculatedISF;
                finalProfile.isfAfternoon = calculatedISF;
                finalProfile.isfEvening = calculatedISF;
            }

            if (tdd > 0) finalProfile.totalDailyDose = tdd;
        }

        onComplete(finalProfile);
    };

    // --- RENDER STEPS ---
    // UNIFICAÇÃO VISUAL: Todos os passos agora usam Teal-100/Teal-600 para consistência com a marca

    const renderStep1 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><UserCog size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">1. Identificação</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <input
                    type="text" placeholder="Nome completo *" className="input-field"
                    value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="input-field" title="Data de Nascimento"
                        value={formData.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)}
                    />
                    <select className="input-field bg-white" value={formData.gender} onChange={(e) => handleChange('gender', e.target.value as Gender)}>
                        {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-500 ml-1 mb-1 block">WhatsApp (com DDD)</label>
                    <input type="tel" placeholder="Ex: 31 99999-9999 *" className="input-field"
                        value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)}
                    />
                    <p className="text-xs text-slate-400 mt-1 ml-1">
                        Adicionaremos o código do país (55) automaticamente se não informar.
                    </p>
                </div>
                <input type="email" placeholder="Email" className="input-field"
                    value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-slate-500 ml-1">Peso (kg)*</label>
                        <input type="number" className="input-field" value={formData.weight || ''} onChange={(e) => handleChange('weight', parseFloat(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 ml-1">Altura (cm)*</label>
                        <input type="number" className="input-field" value={formData.height || ''} onChange={(e) => handleChange('height', parseFloat(e.target.value))} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Activity size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">2. Diagnóstico</h2>
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Tipo de Diabetes*</label>
                <div className="grid grid-cols-1 gap-2">
                    {Object.values(DiabetesType).map(type => (
                        <button key={type} onClick={() => handleChange('diabetesType', type)}
                            className={`select-btn ${formData.diabetesType === type ? 'select-btn-active' : ''}`}>
                            {type} {formData.diabetesType === type && <Check size={18} />}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <label className="text-xs font-medium">Ano Diagnóstico</label>
                        <input type="number" className="input-field" value={formData.diagnosisYear} onChange={(e) => handleChange('diagnosisYear', parseInt(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-xs font-medium">HbA1c Recente (%)</label>
                        <input type="number" step="0.1" className="input-field" value={formData.hba1c || ''} onChange={(e) => handleChange('hba1c', parseFloat(e.target.value))} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Syringe size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">3. Insulina</h2>
            </div>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition">
                <input type="checkbox" checked={formData.usesInsulin} onChange={(e) => handleChange('usesInsulin', e.target.checked)} className="checkbox-teal" />
                <span className="font-medium text-slate-700">Uso Insulina</span>
            </label>

            {formData.usesInsulin && (
                <div className="space-y-4 pl-2 border-l-2 border-teal-100">

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tempo de Ação (Horas)</label>
                        <select
                            className="input-field bg-white"
                            value={formData.insulinDuration}
                            onChange={(e) => handleChange('insulinDuration', parseInt(e.target.value))}
                        >
                            <option value={3}>3 Horas (Ultrarrápida)</option>
                            <option value={4}>4 Horas (Padrão)</option>
                            <option value={5}>5 Horas (Regular)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">Importante para cálculo de insulina ativa (IOB).</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-700">Basal (Lenta)</h4>
                        <input type="text" placeholder="Marca (ex: Lantus)" className="input-field"
                            onChange={(e) => handleNestedChange('basalInsulin', 'brand', e.target.value)} />
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Dose Manhã" className="input-field" onChange={(e) => handleNestedChange('basalInsulin', 'morningDose', parseFloat(e.target.value))} />
                            <input type="time" className="input-field" onChange={(e) => handleNestedChange('basalInsulin', 'morningTime', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Dose Noite" className="input-field" onChange={(e) => handleNestedChange('basalInsulin', 'nightDose', parseFloat(e.target.value))} />
                            <input type="time" className="input-field" onChange={(e) => handleNestedChange('basalInsulin', 'nightTime', e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-700">Bolus (Rápida)</h4>
                        <input type="text" placeholder="Marca (ex: Humalog)" className="input-field"
                            onChange={(e) => handleNestedChange('bolusInsulin', 'brand', e.target.value)} />
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Activity size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">4. Parâmetros</h2>
            </div>

            {!formData.usesInsulin ? <p className="text-slate-500">Pule esta etapa.</p> : (
                <>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Cálculo Automático (Se não souber)</p>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="number" placeholder="Total Basal" className="input-field bg-white" onChange={(e) => setTempBasalTotal(parseFloat(e.target.value))} />
                            <input type="number" placeholder="Total Bolus" className="input-field bg-white" onChange={(e) => setTempBolusTotal(parseFloat(e.target.value))} />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h3 className="font-semibold text-sm text-slate-700">Ratio IC (1:g)</h3>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => handleChange('knowsICRatio', true)} className={`btn-xs ${formData.knowsICRatio ? 'btn-active' : 'btn-inactive'}`}>Sei</button>
                            <button onClick={() => handleChange('knowsICRatio', false)} className={`btn-xs ${!formData.knowsICRatio ? 'btn-active' : 'btn-inactive'}`}>Calcular</button>
                        </div>
                        {formData.knowsICRatio && (
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" placeholder="Café" className="input-field" onChange={(e) => handleChange('icRatioBreakfast', parseFloat(e.target.value))} />
                                <input type="number" placeholder="Almoço" className="input-field" onChange={(e) => handleChange('icRatioLunch', parseFloat(e.target.value))} />
                                <input type="number" placeholder="Jantar" className="input-field" onChange={(e) => handleChange('icRatioDinner', parseFloat(e.target.value))} />
                                <input type="number" placeholder="Lanche" className="input-field" onChange={(e) => handleChange('icRatioSnack', parseFloat(e.target.value))} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h3 className="font-semibold text-sm text-slate-700">Fator Correção (mg/dL)</h3>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => handleChange('knowsISF', true)} className={`btn-xs ${formData.knowsISF ? 'btn-active' : 'btn-inactive'}`}>Sei</button>
                            <button onClick={() => handleChange('knowsISF', false)} className={`btn-xs ${!formData.knowsISF ? 'btn-active' : 'btn-inactive'}`}>Calcular</button>
                        </div>
                        {formData.knowsISF && (
                            <div className="grid grid-cols-3 gap-2">
                                <input type="number" placeholder="Manhã" className="input-field" onChange={(e) => handleChange('isfMorning', parseFloat(e.target.value))} />
                                <input type="number" placeholder="Tarde" className="input-field" onChange={(e) => handleChange('isfAfternoon', parseFloat(e.target.value))} />
                                <input type="number" placeholder="Noite" className="input-field" onChange={(e) => handleChange('isfEvening', parseFloat(e.target.value))} />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <h3 className="font-semibold text-sm text-slate-700">Metas Glicêmicas</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <label className="text-[10px] uppercase text-slate-500">Pré-Refeição</label>
                                <input type="number" value={formData.targetGlucosePreMeal} onChange={(e) => handleChange('targetGlucosePreMeal', parseFloat(e.target.value))} className="input-field font-bold text-teal-700" />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] uppercase text-slate-500">Pós-Refeição</label>
                                <input type="number" value={formData.targetGlucosePostMeal} onChange={(e) => handleChange('targetGlucosePostMeal', parseFloat(e.target.value))} className="input-field font-bold text-teal-700" />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><AlertCircle size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">5. Monitoramento</h2>
            </div>

            <div>
                <label className="label-title">Frequência de Medição</label>
                <select className="input-field bg-white" value={formData.measurementFrequency} onChange={(e) => handleChange('measurementFrequency', e.target.value)}>
                    <option>1-2 vezes/dia</option>
                    <option>3-4 vezes/dia</option>
                    <option>5+ vezes/dia</option>
                    <option>Uso Monitor Contínuo (CGM)</option>
                </select>
            </div>

            {formData.measurementFrequency.includes('CGM') && (
                <div>
                    <label className="label-title">Modelo CGM</label>
                    <input type="text" placeholder="Ex: Libre 2, Dexcom" className="input-field"
                        value={formData.cgmModel || ''} onChange={(e) => handleChange('cgmModel', e.target.value)} />
                </div>
            )}

            <div className="pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"> Histórico Crítico</h3>

                <label className="label-title">Hipoglicemia (&lt;70)</label>
                <select className="input-field bg-white mb-2" value={formData.hypoglycemiaFrequency} onChange={(e) => handleChange('hypoglycemiaFrequency', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>Nunca</option>
                    <option>1-2 vezes/mês</option>
                    <option>1-2 vezes/semana</option>
                    <option>Frequentemente</option>
                </select>

                <label className="label-title">Sintomas Hipo</label>
                <div className="flex flex-wrap gap-2 mb-4">
                    {['Tremores', 'Suor Frio', 'Confusão', 'Fome', 'Visão Turva'].map(s => (
                        <button key={s} onClick={() => toggleArrayItem('hypoglycemiaSymptoms', s)}
                            className={`tag-btn ${formData.hypoglycemiaSymptoms?.includes(s) ? 'tag-btn-active-red' : ''}`}>{s}</button>
                    ))}
                </div>

                <label className="label-title">Hiperglicemia (&gt;250)</label>
                <select className="input-field bg-white" value={formData.hyperglycemiaFrequency} onChange={(e) => handleChange('hyperglycemiaFrequency', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option>Raramente</option>
                    <option>Semanalmente</option>
                    <option>Diariamente</option>
                </select>
            </div>
        </div>
    );

    const renderStep6 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Utensils size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">6. Alimentação</h2>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {['breakfast', 'lunch', 'dinner'].map((m) => (
                    <div key={m}>
                        <label className="text-[10px] uppercase font-bold text-slate-500">{m === 'breakfast' ? 'Café' : m === 'lunch' ? 'Almoço' : 'Jantar'}</label>
                        <input type="time" className="input-field"
                            value={(formData.mealTimes as any)[m]}
                            onChange={(e) => handleNestedChange('mealTimes', m, e.target.value)} />
                    </div>
                ))}
            </div>

            <div>
                <label className="label-title">Dieta Especial?</label>
                <div className="flex flex-wrap gap-2">
                    {['Low Carb', 'Vegana', 'Mediterrânea', 'Padrão'].map(d => (
                        <button key={d} onClick={() => toggleArrayItem('dietType', d)}
                            className={`tag-btn ${formData.dietType?.includes(d) ? 'tag-btn-active' : ''}`}>{d}</button>
                    ))}
                </div>
            </div>

            <div>
                <label className="label-title">Conta Carboidratos?</label>
                <select className="input-field bg-white"
                    value={formData.carbCountingKnowledge}
                    onChange={(e) => handleChange('carbCountingKnowledge', e.target.value)}>
                    <option>Sempre</option>
                    <option>Às vezes</option>
                    <option>Não sei</option>
                </select>
            </div>

            <div>
                <label className="label-title">Alimentos Problemáticos</label>
                <div className="flex flex-wrap gap-2">
                    {['Pizza', 'Massas', 'Doces', 'Pão', 'Arroz Branco', 'Refrigerante'].map(f => (
                        <button key={f} onClick={() => toggleArrayItem('problematicFoods', f)}
                            className={`tag-btn ${formData.problematicFoods?.includes(f) ? 'tag-btn-active-red' : ''}`}>{f}</button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep7 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Heart size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">7. Estilo de Vida</h2>
            </div>

            <div>
                <label className="label-title">Exercícios</label>
                <select className="input-field bg-white" value={formData.exerciseFrequency} onChange={(e) => handleChange('exerciseFrequency', e.target.value)}>
                    <option>Não pratico</option>
                    <option>1-2x semana</option>
                    <option>3-4x semana</option>
                    <option>5+x semana</option>
                </select>
            </div>

            {formData.exerciseFrequency !== 'Não pratico' && (
                <div>
                    <label className="label-title">Tipo de Exercício</label>
                    <div className="flex flex-wrap gap-2">
                        {['Caminhada', 'Musculação', 'Corrida', 'Natação'].map(e => (
                            <button key={e} onClick={() => toggleArrayItem('exerciseType', e)}
                                className={`tag-btn ${formData.exerciseType?.includes(e) ? 'tag-btn-active' : ''}`}>{e}</button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                    <label className="label-title">Fuma?</label>
                    <select className="input-field bg-white" value={formData.smoker} onChange={(e) => handleChange('smoker', e.target.value)}>
                        <option>Não</option>
                        <option>Sim</option>
                        <option>Ex-fumante</option>
                    </select>
                </div>
                <div>
                    <label className="label-title">Álcool?</label>
                    <select className="input-field bg-white" value={formData.alcoholConsumption} onChange={(e) => handleChange('alcoholConsumption', e.target.value)}>
                        <option>Não</option>
                        <option>Ocasionalmente</option>
                        <option>Frequentemente</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="label-title">Qualidade do Sono</label>
                <select className="input-field bg-white" value={formData.sleepQuality} onChange={(e) => handleChange('sleepQuality', e.target.value)}>
                    <option>Durmo bem</option>
                    <option>Durmo pouco</option>
                    <option>Insônia</option>
                </select>
            </div>
        </div>
    );

    const renderStep8 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Stethoscope size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">8. Saúde & Meds</h2>
            </div>

            <div>
                <label className="label-title">Medicamentos Diabetes (Não Insulina)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {['Metformina', 'Jardiance', 'Ozempic', 'Gliclazida'].map(m => (
                        <button key={m} onClick={() => {
                            const exists = formData.otherDiabetesMedications?.find(d => d.name === m);
                            if (exists) {
                                setFormData(prev => ({ ...prev, otherDiabetesMedications: prev.otherDiabetesMedications?.filter(d => d.name !== m) }));
                            } else {
                                setFormData(prev => ({ ...prev, otherDiabetesMedications: [...(prev.otherDiabetesMedications || []), { name: m, dose: '', frequency: '' }] }));
                            }
                        }}
                            className={`tag-btn ${formData.otherDiabetesMedications?.find(d => d.name === m) ? 'tag-btn-active' : ''}`}>{m}</button>
                    ))}
                </div>
            </div>

            <div>
                <label className="label-title">Meds que Afetam Glicemia</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {['Corticoides', 'Anticonvulsivantes', 'Antibióticos'].map(c => (
                        <button key={c} onClick={() => toggleArrayItem('medicationsAffectingGlucose', c)}
                            className={`tag-btn ${formData.medicationsAffectingGlucose?.includes(c) ? 'tag-btn-active-red' : ''}`}>{c}</button>
                    ))}
                </div>
            </div>

            <div>
                <label className="label-title">Comorbidades</label>
                <div className="flex flex-wrap gap-2">
                    {['Hipertensão', 'Colesterol', 'Neuropatia', 'Retinopatia', 'Doença Renal'].map(c => (
                        <button key={c} onClick={() => toggleArrayItem('comorbidities', c)}
                            className={`tag-btn ${formData.comorbidities?.includes(c) ? 'tag-btn-active-red' : ''}`}>{c}</button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep9 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><UserCog size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">9. Equipe Médica</h2>
            </div>

            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.hasEndocrinologist} onChange={(e) => handleChange('hasEndocrinologist', e.target.checked)} className="checkbox-teal" />
                    <span>Tenho Endócrino</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.hasNutritionist} onChange={(e) => handleChange('hasNutritionist', e.target.checked)} className="checkbox-teal" />
                    <span>Tenho Nutricionista</span>
                </label>
            </div>

            {formData.hasEndocrinologist && (
                <div>
                    <label className="label-title">Frequência Consultas</label>
                    <select className="input-field bg-white" value={formData.consultationFrequency} onChange={(e) => handleChange('consultationFrequency', e.target.value)}>
                        <option value="">Selecione...</option>
                        <option>Mensal</option>
                        <option>Trimestral</option>
                        <option>Semestral</option>
                        <option>Anual</option>
                    </select>
                </div>
            )}

            <div>
                <label className="label-title">Objetivos Principais</label>
                <div className="flex flex-col gap-2 mt-2">
                    {['Melhorar HbA1c', 'Evitar Hipoglicemia', 'Perder Peso', 'Contar Carboidratos'].map(obj => (
                        <label key={obj} className="flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={formData.treatmentGoals.includes(obj)} onChange={() => toggleArrayItem('treatmentGoals', obj)} className="checkbox-teal" />
                            {obj}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep10 = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Bell size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">10. Preferências</h2>
            </div>

            <div>
                <label className="label-title">Lembretes</label>
                <div className="flex flex-wrap gap-2">
                    {['Glicemia', 'Insulina', 'Água', 'Exercício'].map(r => (
                        <button key={r} onClick={() => toggleArrayItem('reminders', r)}
                            className={`tag-btn ${formData.reminders.includes(r) ? 'tag-btn-active' : ''}`}>{r}</button>
                    ))}
                </div>
            </div>

            <div>
                <label className="label-title">Estilo de Comunicação</label>
                <div className="flex gap-2">
                    {['Direto', 'Amigável', 'Educativo'].map(s => (
                        <button key={s} onClick={() => handleChange('communicationStyle', s)}
                            className={`flex-1 p-2 rounded border text-sm ${formData.communicationStyle === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{s}</button>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={formData.caregiver?.active} onChange={(e) => setFormData(prev => ({ ...prev, caregiver: { ...prev.caregiver!, active: e.target.checked } }))} className="checkbox-teal" />
                    <span className="font-bold text-slate-700">Adicionar Cuidador/Familiar</span>
                </label>
                {formData.caregiver?.active && (
                    <div className="space-y-2 pl-4 border-l-2 border-teal-100">
                        <input type="text" placeholder="Nome" className="input-field" value={formData.caregiver.name} onChange={(e) => handleNestedChange('caregiver', 'name', e.target.value)} />
                        <input type="text" placeholder="WhatsApp" className="input-field" value={formData.caregiver.phone} onChange={(e) => handleNestedChange('caregiver', 'phone', e.target.value)} />
                        <select className="input-field bg-white" value={formData.caregiver.relation} onChange={(e) => handleNestedChange('caregiver', 'relation', e.target.value)}>
                            <option value="">Relação...</option>
                            <option>Mãe/Pai</option>
                            <option>Cônjuge</option>
                            <option>Filho(a)</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep11 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><ShieldCheck size={20} /></div>
                <h2 className="text-xl font-bold text-slate-800">11. Consentimento</h2>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {[
                    { k: 'termsAccepted', t: 'Li e aceito os Termos de Uso.' },
                    { k: 'medicalDisclaimerAccepted', t: 'Entendo que este app é APENAS suporte e não substitui médico.' },
                    { k: 'dataProcessingConsent', t: 'Autorizo processamento de dados (LGPD).' },
                    { k: 'doctorSharingConsent', t: 'Autorizo envio de relatórios ao meu médico.' }
                ].map((item) => (
                    <label key={item.k} className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={(formData as any)[item.k]} onChange={(e) => handleChange(item.k as any, e.target.checked)} className="checkbox-teal mt-1" />
                        <span className="text-sm text-slate-600 leading-tight">{item.t}</span>
                    </label>
                ))}
            </div>
        </div>
    );

    // Styles utility
    const btnClass = "py-3 px-6 rounded-xl font-semibold transition-all shadow-md flex items-center justify-center gap-2";

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <style>{`
        .input-field { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; outline: none; transition: border-color 0.2s; background: white; color: #1e293b; }
        .input-field:focus { border-color: #0d9488; ring: 2px solid #ccfbf1; }
        .select-btn { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: left; display: flex; justify-content: space-between; align-items: center; background: white; color: #334155; }
        .select-btn-active { border-color: #0d9488; background-color: #f0fdfa; color: #0f766e; }
        .tag-btn { padding: 0.5rem 0.75rem; border-radius: 9999px; border: 1px solid #e2e8f0; font-size: 0.75rem; background: white; color: #475569; transition: all; }
        .tag-btn-active { border-color: #0d9488; background-color: #0d9488; color: white; }
        .tag-btn-active-red { border-color: #ef4444; background-color: #fef2f2; color: #b91c1c; font-weight: 600; }
        .checkbox-teal { width: 1.25rem; height: 1.25rem; accent-color: #0d9488; border-radius: 0.25rem; }
        .label-title { display: block; font-size: 0.875rem; font-weight: 600; color: #334155; margin-bottom: 0.5rem; }
        .btn-xs { flex: 1; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; font-size: 0.875rem; }
        .btn-inactive { background: white; color: #64748b; }
        .btn-active { background: #0d9488; color: white; border-color: #0d9488; }
      `}</style>

            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 flex-shrink-0">
                    <div className="bg-teal-500 h-2 transition-all duration-500 ease-out" style={{ width: `${(step / totalSteps) * 100}%` }} />
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="min-h-[300px]">
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                        {step === 5 && renderStep5()}
                        {step === 6 && renderStep6()}
                        {step === 7 && renderStep7()}
                        {step === 8 && renderStep8()}
                        {step === 9 && renderStep9()}
                        {step === 10 && renderStep10()}
                        {step === 11 && renderStep11()}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0 flex gap-3">
                    {step > 1 && (
                        <button onClick={handleBack} className={`${btnClass} bg-white text-slate-600 border border-slate-200 hover:bg-slate-50`}>
                            <ChevronLeft size={20} /> Voltar
                        </button>
                    )}
                    <button onClick={handleNext} className={`${btnClass} bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200 flex-1`}>
                        {step === totalSteps ? 'Finalizar Cadastro' : 'Continuar'}
                        {step !== totalSteps && <ChevronRight size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};