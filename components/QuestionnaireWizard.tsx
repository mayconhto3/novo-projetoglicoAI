import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { InfoTooltip } from './ui/InfoTooltip';
import { Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8 } from './WizardSteps';
import { UserProfile } from '../types';
import '../styles/wizard.css';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface QuestionnaireWizardProps {
    onComplete: (profile: UserProfile) => void;
}

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface WizardData {
    // Step 1: Informações Básicas
    name: string;
    phone: string; // CRÍTICO: Campo de WhatsApp
    birthDate: string;
    gender: 'male' | 'female' | 'other' | '';

    // Step 2: Sobre o Diabetes
    diabetesType: 'type1' | 'type2' | 'gestational' | '';
    diagnosisYear: string;

    // Step 3: Dados Físicos
    weight: string;
    height: string;

    // Step 4: Uso de Insulina
    usesInsulin: boolean | null;
    insulinMethod: 'pen' | 'pump' | 'syringe' | '';
    insulinStep: '1.0' | '0.5' | '0.1' | '';

    // Step 5: Insulina Basal
    basalInsulin: string;
    basalDoseMorning: string;
    basalDoseNight: string;
    basalTimeMorning: string;
    basalTimeNight: string;

    // Step 6: Insulina Bolus
    bolusInsulin: string;

    // Step 7: Ratios IC
    icRatioBreakfast: string;
    icRatioLunch: string;
    icRatioDinner: string;
    icRatioSnack: string;

    // Step 8: Metas e Sensibilidade
    targetGlucosePreMeal: string;
    targetGlucosePostMeal: string;
    isfMorning: string;
}

const STORAGE_KEY = 'wizard_data_temp';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const QuestionnaireWizard: React.FC<QuestionnaireWizardProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado inicial
    const [data, setData] = useState<WizardData>({
        name: '',
        phone: '', // CRÍTICO: WhatsApp
        birthDate: '',
        gender: '',
        diabetesType: '',
        diagnosisYear: '',
        weight: '',
        height: '',
        usesInsulin: null,
        insulinMethod: '',
        insulinStep: '',
        basalInsulin: '',
        basalDoseMorning: '',
        basalDoseNight: '',
        basalTimeMorning: '',
        basalTimeNight: '',
        bolusInsulin: '',
        icRatioBreakfast: '',
        icRatioLunch: '',
        icRatioDinner: '',
        icRatioSnack: '',
        targetGlucosePreMeal: '',
        targetGlucosePostMeal: '',
        isfMorning: '',
    });

    // ============================================================================
    // PERSISTÊNCIA DE ESTADO (Tech Lead Tip)
    // ============================================================================

    // Restaurar estado ao carregar
    useEffect(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setData(parsed.data);
                setCurrentStep(parsed.step);
                console.log('[Wizard] Estado restaurado do localStorage');
            } catch (err) {
                console.error('[Wizard] Erro ao restaurar estado:', err);
            }
        }
    }, []);

    // Salvar estado a cada mudança
    useEffect(() => {
        if (currentStep > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data,
                step: currentStep,
                timestamp: new Date().toISOString()
            }));
        }
    }, [data, currentStep]);

    // ============================================================================
    // NAVEGAÇÃO
    // ============================================================================

    const nextStep = () => {
        if (currentStep < 8) {
            setCurrentStep(currentStep + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // ============================================================================
    // SUBMISSÃO FINAL
    // ============================================================================

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            // CRÍTICO: Limpar telefone (remover máscara)
            let cleanPhone = data.phone.replace(/\D/g, '');
            // Adicionar código do Brasil se necessário
            if (cleanPhone.length === 11) {
                cleanPhone = '55' + cleanPhone; // 5511999999999
            }

            // Converter dados do wizard para UserProfile
            const profile: UserProfile = {
                name: data.name,
                email: '', // Será preenchido pelo App.tsx
                phone: cleanPhone, // CRÍTICO: Telefone limpo
                birthDate: data.birthDate,
                gender: data.gender as any,
                diabetesType: data.diabetesType as any,
                diagnosisYear: parseInt(data.diagnosisYear),
                weight: parseFloat(data.weight),
                height: parseFloat(data.height),
                usesInsulin: data.usesInsulin || false,
                insulinMethod: data.insulinMethod,
                insulinStep: parseFloat(data.insulinStep),
                basalInsulin: {
                    brand: data.basalInsulin,
                    doseMorning: parseFloat(data.basalDoseMorning) || 0,
                    doseNight: parseFloat(data.basalDoseNight) || 0,
                    timeMorning: data.basalTimeMorning,
                    timeNight: data.basalTimeNight,
                },
                bolusInsulin: {
                    brand: data.bolusInsulin,
                },
                icRatioBreakfast: parseFloat(data.icRatioBreakfast),
                icRatioLunch: parseFloat(data.icRatioLunch),
                icRatioDinner: parseFloat(data.icRatioDinner),
                icRatioSnack: parseFloat(data.icRatioSnack),
                targetGlucosePreMeal: parseFloat(data.targetGlucosePreMeal),
                targetGlucosePostMeal: parseFloat(data.targetGlucosePostMeal),
                isfMorning: parseFloat(data.isfMorning),
            };

            console.log('[Wizard] Dados convertidos, chamando onComplete');

            // Limpar localStorage após sucesso
            localStorage.removeItem(STORAGE_KEY);

            // Chamar callback do App.tsx
            onComplete(profile);
        } catch (err: any) {
            console.error('[Wizard] Erro ao processar dados:', err);
            setError(err.message || 'Erro ao processar dados');
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // PROGRESS BAR
    // ============================================================================

    const progress = (currentStep / 8) * 100;

    return (
        <div className="wizard-container">
            {/* Progress Bar */}
            <div className="wizard-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">
                    Passo {currentStep} de 8
                </p>
            </div>

            {/* Step Content */}
            <div className="wizard-content">
                {currentStep === 1 && <Step1 data={data} setData={setData} />}
                {currentStep === 2 && <Step2 data={data} setData={setData} />}
                {currentStep === 3 && <Step3 data={data} setData={setData} />}
                {currentStep === 4 && <Step4 data={data} setData={setData} />}
                {currentStep === 5 && <Step5 data={data} setData={setData} />}
                {currentStep === 6 && <Step6 data={data} setData={setData} />}
                {currentStep === 7 && <Step7 data={data} setData={setData} />}
                {currentStep === 8 && <Step8 data={data} setData={setData} />}
            </div>

            {/* Error */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="wizard-navigation">
                {currentStep > 1 && (
                    <button onClick={prevStep} className="btn-secondary">
                        <ArrowLeft size={20} />
                        <span>Voltar</span>
                    </button>
                )}

                {currentStep < 8 ? (
                    <button onClick={nextStep} className="btn-primary">
                        <span>Próximo</span>
                        <ArrowRight size={20} />
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={loading} className="btn-primary">
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

            <style jsx>{`
        .wizard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
          padding: 24px;
        }

        .wizard-progress {
          max-width: 800px;
          margin: 0 auto 32px;
        }

        .progress-bar {
          height: 8px;
          background: var(--color-gray-200);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #029491 0%, #56da98 100%);
          transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px rgba(2, 148, 145, 0.5);
        }

        .progress-text {
          text-align: center;
          font-size: var(--font-size-sm);
          color: var(--color-gray-600);
          margin: 0;
        }

        .wizard-content {
          max-width: 800px;
          margin: 0 auto 32px;
        }

        .error-message {
          max-width: 800px;
          margin: 0 auto 16px;
          padding: 12px 16px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          color: #dc2626;
          font-size: var(--font-size-sm);
        }

        .wizard-navigation {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          gap: 16px;
          justify-content: space-between;
        }

        .btn-primary,
        .btn-secondary {
          padding: 16px 32px;
          border: none;
          border-radius: 12px;
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all var(--transition-normal);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #029491 0%, #56da98 100%);
          color: white;
          box-shadow: 0 10px 20px rgba(2, 148, 145, 0.3);
          margin-left: auto;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(2, 148, 145, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: var(--color-gray-700);
          border: 2px solid var(--color-gray-300);
        }

        .btn-secondary:hover {
          background: var(--color-gray-50);
          border-color: var(--color-gray-400);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

// ============================================================================
// STEP COMPONENTS (continuação no próximo arquivo)
// ============================================================================
