// OS-2026-BETA: Questionário Simplificado com Design Premium
// HOTFIX: Restauração do Design Original + Lógica Enxuta
// Data: 2026-01-15

import React, { useState, useEffect } from 'react';
import { UserProfile, DiabetesType, Gender } from '../types';
import { ArrowRight, Check, Heart, Droplet, Activity } from 'lucide-react';
import { PillTag } from './ui/PillTag';
import { CustomSelect } from './ui/CustomSelect';
import '../styles/wizard.css';

// ============================================================================
// CONSTANTES DE INSULINAS (Sincronizado com Settings.tsx)
// ============================================================================

const BASAL_INSULIN_BRANDS = [
    'Lantus',
    'Basaglar',
    'Semglee',
    'Rezvoglar',
    'Basalog',
    'Basalog One',
    'Glaritus',
    'Glaricon',
    'Glarisulin',
    'Lansta',
    'Toujeo',
    'Tresiba',
    'Levemir',
    'Humulin N',
    'Novolin N',
    'Iletin II',
    'Insulatard MC',
    'Protaphane HM',
    'Outro'
];

const BOLUS_INSULIN_BRANDS = [
    'Humalog',
    'NovoRapid',
    'Fiasp',
    'Apidra',
    'Lyumjev',
    'Admelog',
    'Insulin Lispro',
    'Insulin Aspart',
    'Insulin Glulisine',
    'Humulin R',
    'Novolin R',
    'Actrapid',
    'Regular Iletin II',
    'Outro'
];

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface QuestionnaireWizardProps {
    onComplete: (profile: UserProfile) => void;
    session: any;
}

interface SimplifiedFormData {
    name: string;
    email: string;
    phone: string;
    diabetesType: string;
    therapyType: string;
    basalInsulin: string;
    bolusInsulin: string;
    correctionFactor: string;
    carbRatio: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const QuestionnaireWizard: React.FC<QuestionnaireWizardProps> = ({ onComplete, session }) => {
    // Auto-fill de dados da sessão
    const authEmail = session?.user?.email || '';
    const metaName = session?.user?.user_metadata?.full_name
        || session?.user?.user_metadata?.name
        || session?.user?.email?.split('@')[0]
        || 'Usuário';

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<SimplifiedFormData>({
        name: metaName,
        email: authEmail,
        phone: '',
        diabetesType: '',
        therapyType: '',
        basalInsulin: '',
        bolusInsulin: '',
        correctionFactor: '',
        carbRatio: ''
    });

    // Atualizar auto-fill quando sessão carregar
    useEffect(() => {
        if (metaName && !formData.name) {
            setFormData(prev => ({ ...prev, name: metaName }));
        }
        if (authEmail && !formData.email) {
            setFormData(prev => ({ ...prev, email: authEmail }));
        }
    }, [metaName, authEmail]);

    // ========================================
    // MÁSCARA DE TELEFONE
    // ========================================

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setFormData({ ...formData, phone: formatted });
    };

    // ========================================
    // SUBMIT COM DEFAULTS
    // ========================================

    const handleSubmit = async () => {
        setLoading(true);

        // Determinar se usa insulina
        const usesInsulin = formData.therapyType === 'pen' || formData.therapyType === 'pump';
        const insulinMethod = formData.therapyType === 'pump' ? 'Bomba' :
            formData.therapyType === 'pen' ? 'Caneta' : undefined;

        // Mapear tipo de diabetes
        const diabetesTypeMap: Record<string, DiabetesType> = {
            'Tipo 1': DiabetesType.Type1,
            'Tipo 2': DiabetesType.Type2,
            'LADA': DiabetesType.Type1, // LADA é considerado Tipo 1
            'Gestacional': DiabetesType.Gestational
        };

        const finalProfile: UserProfile = {
            // Dados reais
            name: formData.name || 'Usuário',
            email: formData.email,
            phone: formData.phone.replace(/\D/g, ''),
            diabetesType: diabetesTypeMap[formData.diabetesType] || DiabetesType.Unknown,

            // Dados inferidos
            usesInsulin,
            insulinMethod,

            // Defaults de segurança
            birthDate: new Date().toISOString(),
            gender: Gender.Other,
            weight: 0,
            height: 0,
            diagnosisYear: new Date().getFullYear(),

            // Insulinas
            basalInsulin: {
                uses: !!formData.basalInsulin,
                brand: formData.basalInsulin || undefined
            },
            bolusInsulin: {
                uses: !!formData.bolusInsulin,
                brand: formData.bolusInsulin || undefined
            },

            // Fatores
            knowsISF: !!formData.correctionFactor,
            isfMorning: formData.correctionFactor ? Number(formData.correctionFactor) : undefined,
            isfAfternoon: formData.correctionFactor ? Number(formData.correctionFactor) : undefined,
            isfEvening: formData.correctionFactor ? Number(formData.correctionFactor) : undefined,

            knowsICRatio: !!formData.carbRatio,
            icRatioBreakfast: formData.carbRatio ? Number(formData.carbRatio) : undefined,
            icRatioLunch: formData.carbRatio ? Number(formData.carbRatio) : undefined,
            icRatioDinner: formData.carbRatio ? Number(formData.carbRatio) : undefined,

            // Metas
            targetGlucosePreMeal: 100,
            targetGlucosePostMeal: 140,
            targetsDefinedByDoctor: false,

            // Defaults vazios
            measurementFrequency: '3x',
            usesCGM: false,
            mealTimes: {
                breakfast: '08:00',
                lunch: '12:00',
                dinner: '19:00'
            },
            treatmentGoals: ['Controle glicêmico'],
            exerciseFrequency: 'Sedentário',
            smoker: 'Não',
            alcoholConsumption: 'Nunca',
            stressLevel: 'Médio',
            sleepQuality: 'Boa',
            hasEndocrinologist: false,
            hasNutritionist: false,
            reminders: [],
            checkInFrequency: 'Diário',
            communicationStyle: 'Amigável',
            termsAccepted: true,
            medicalDisclaimerAccepted: true,
            dataProcessingConsent: true,
            doctorSharingConsent: false
        };

        // Delay para UX
        setTimeout(() => {
            onComplete(finalProfile);
        }, 800);
    };

    // ========================================
    // VALIDAÇÃO
    // ========================================

    const canProceedStep1 = () => {
        return formData.phone.length >= 14 && !!formData.diabetesType;
    };

    const canProceedStep2 = () => {
        return !!formData.therapyType;
    };

    // ========================================
    // RENDER
    // ========================================

    const progress = (currentStep / 3) * 100;

    return (
        <div className="wizard-container">
            {/* Progress Bar Premium */}
            <div className="wizard-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">Passo {currentStep} de 3</p>
            </div>

            <div className="wizard-content">
                {/* PASSO 1: IDENTIFICAÇÃO */}
                {currentStep === 1 && (
                    <div className="wizard-step animate-fadeIn">
                        <div className="step-header">
                            <div className="step-header-title">
                                <Heart className="step-icon" />
                                <h2>Olá, {formData.name.split(' ')[0]}!</h2>
                            </div>
                            <p style={{ color: 'var(--color-gray-500)', margin: 0 }}>
                                Vamos configurar seu assistente pessoal.
                            </p>
                        </div>

                        <div className="form-section">
                            <div className="form-field">
                                <label>Seu WhatsApp (Essencial)</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                />
                                <small style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Usaremos para enviar suas análises e lembretes
                                </small>
                            </div>

                            <div className="form-field">
                                <label>Tipo de Diabetes</label>
                                <div className="pills-container">
                                    {['Tipo 1', 'Tipo 2', 'LADA', 'Gestacional'].map(type => (
                                        <PillTag
                                            key={type}
                                            label={type}
                                            isSelected={formData.diabetesType === type}
                                            onClick={() => setFormData({ ...formData, diabetesType: type })}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PASSO 2: TERAPIA */}
                {currentStep === 2 && (
                    <div className="wizard-step animate-fadeIn">
                        <div className="step-header">
                            <Droplet className="step-icon" />
                            <h2>Seu Tratamento</h2>
                            <p style={{ color: 'var(--color-gray-500)', marginTop: '8px' }}>
                                Isso ajuda a IA a personalizar as sugestões
                            </p>
                        </div>

                        <div className="form-section">
                            <div className="form-field">
                                <CustomSelect
                                    label="Qual sua terapia principal?"
                                    value={formData.therapyType}
                                    onChange={(val) => setFormData({ ...formData, therapyType: val })}
                                    options={[
                                        { value: 'pen', label: '💉 Canetas / Seringas (MDI)' },
                                        { value: 'pump', label: '🔋 Bomba de Insulina' },
                                        { value: 'oral', label: '💊 Apenas Comprimidos/Dieta' }
                                    ]}
                                    placeholder="Selecione..."
                                />
                            </div>

                            {(formData.therapyType === 'pen' || formData.therapyType === 'pump') && (
                                <div className="form-section" style={{
                                    marginTop: '24px',
                                    borderTop: '1px solid var(--color-gray-200)',
                                    paddingTop: '24px'
                                }}>
                                    <div style={{
                                        backgroundColor: '#eff6ff',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        marginBottom: '16px',
                                        border: '1px solid #dbeafe'
                                    }}>
                                        <p style={{ color: '#1e40af', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>
                                            💡 <strong>Opcional:</strong> Se souber as marcas, ajuda a IA a ser mais precisa
                                        </p>
                                    </div>

                                    <div className="form-field">
                                        <CustomSelect
                                            label="Insulina Basal (Lenta)"
                                            options={BASAL_INSULIN_BRANDS}
                                            value={formData.basalInsulin}
                                            onChange={(v) => setFormData({ ...formData, basalInsulin: v })}
                                            placeholder="Selecione a marca"
                                        />
                                        <small style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            Insulina de ação lenta/prolongada (ex: Lantus, Tresiba)
                                        </small>
                                    </div>

                                    <div className="form-field">
                                        <CustomSelect
                                            label="Insulina Bolus (Rápida)"
                                            options={BOLUS_INSULIN_BRANDS}
                                            value={formData.bolusInsulin}
                                            onChange={(v) => setFormData({ ...formData, bolusInsulin: v })}
                                            placeholder="Selecione a marca"
                                        />
                                        <small style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            Insulina de ação rápida para refeições (ex: NovoRapid, Humalog)
                                        </small>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PASSO 3: FATORES */}
                {currentStep === 3 && (
                    <div className="wizard-step animate-fadeIn">
                        <div className="step-header">
                            <Activity className="step-icon" />
                            <h2>Fatores de Cálculo</h2>
                            <p style={{ color: 'var(--color-gray-500)', marginTop: '8px' }}>
                                Essenciais para a calculadora de bolus
                            </p>
                        </div>

                        <div className="form-section">
                            <div style={{
                                backgroundColor: '#eff6ff',
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '24px',
                                border: '1px solid #dbeafe'
                            }}>
                                <p style={{ color: '#1e40af', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
                                    🤖 <strong>Ajude a IA:</strong> Se você souber seus fatores, a IA poderá calcular suas doses.
                                    Se não souber, deixe em branco e consulte seu médico.
                                </p>
                            </div>

                            <div className="form-field">
                                <label>Fator de Sensibilidade (FS)</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 40 (1u baixa 40mg/dL)"
                                    value={formData.correctionFactor}
                                    onChange={(e) => setFormData({ ...formData, correctionFactor: e.target.value })}
                                    step="1"
                                    min="0"
                                />
                                <small style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Quanto 1 unidade de insulina reduz sua glicemia
                                </small>
                            </div>

                            <div className="form-field">
                                <label>Razão de Carboidrato (I:C)</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 10 (1u cobre 10g)"
                                    value={formData.carbRatio}
                                    onChange={(e) => setFormData({ ...formData, carbRatio: e.target.value })}
                                    step="1"
                                    min="0"
                                />
                                <small style={{ color: 'var(--color-gray-500)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Quantos gramas de carboidrato 1 unidade de insulina cobre
                                </small>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons (Estilo Original) */}
            <div className="wizard-navigation">
                {currentStep > 1 && (
                    <button
                        onClick={() => setCurrentStep(c => c - 1)}
                        className="btn-secondary"
                    >
                        <span>Voltar</span>
                    </button>
                )}

                {currentStep < 3 ? (
                    <button
                        onClick={() => {
                            // Validação do passo atual
                            if (currentStep === 1 && !canProceedStep1()) {
                                alert('Por favor, preencha o WhatsApp e selecione o tipo de diabetes.');
                                return;
                            }
                            if (currentStep === 2 && !canProceedStep2()) {
                                alert('Por favor, selecione sua terapia.');
                                return;
                            }
                            setCurrentStep(c => c + 1);
                        }}
                        className="btn-primary"
                        disabled={currentStep === 1 ? !canProceedStep1() : !canProceedStep2()}
                    >
                        <span>Próximo</span>
                        <ArrowRight size={20} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? (
                            <>
                                <div className="spinner" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <Check size={20} />
                                <span>Concluir</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
