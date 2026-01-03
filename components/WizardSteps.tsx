// OS-16 UX Revision: Wizard Steps - Clean Form Design
// Responsabilidade: Steps com design limpo, pills, selects e inputs organizados
// Data: 2026-01-03
// Padrão: Clean Healthcare Form

import React from 'react';
import { Heart, Activity, Droplet, Syringe, Utensils, Pill, Stethoscope, Clock } from 'lucide-react';
import { InfoTooltip } from './ui/InfoTooltip';
import { PillTag } from './ui/PillTag';

interface StepProps {
    data: any;
    setData: (data: any) => void;
}

// ============================================================================
// STEP 1: INFORMAÇÕES BÁSICAS
// ============================================================================

export const Step1: React.FC<StepProps> = ({ data, setData }) => {
    // Máscara de telefone brasileiro
    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        }
        return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setData({ ...data, phone: formatted });
    };

    return (
        <div className="wizard-step">
            <div className="step-header">
                <Heart className="step-icon" />
                <h2>1. Informações Básicas</h2>
            </div>

            <div className="form-section">
                <div className="form-field">
                    <label>Nome Completo</label>
                    <input
                        type="text"
                        value={data.name || ''}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                        placeholder="Seu nome completo"
                    />
                </div>

                <div className="form-field">
                    <label>WhatsApp (Importante para notificações)</label>
                    <input
                        type="tel"
                        value={data.phone || ''}
                        onChange={handlePhoneChange}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                    />
                    <small style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)', marginTop: '4px', display: 'block' }}>
                        Usaremos para enviar lembretes e dicas personalizadas
                    </small>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Data de Nascimento</label>
                        <input
                            type="date"
                            value={data.birthDate || ''}
                            onChange={(e) => setData({ ...data, birthDate: e.target.value })}
                        />
                    </div>

                    <div className="form-field">
                        <label>Gênero</label>
                        <select
                            value={data.gender || ''}
                            onChange={(e) => setData({ ...data, gender: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                            <option value="other">Outro</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// STEP 2: DIAGNÓSTICO
// ============================================================================

export const Step2: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Droplet className="step-icon" />
            <h2>2. Diagnóstico</h2>
        </div>

        <div className="form-section">
            <div className="form-field">
                <label>Tipo de Diabetes*</label>
                <div className="pills-container">
                    <PillTag
                        label="Tipo 1"
                        isSelected={data.diabetesType === 'type1'}
                        onClick={() => setData({ ...data, diabetesType: 'type1' })}
                    />
                    <PillTag
                        label="Tipo 2"
                        isSelected={data.diabetesType === 'type2'}
                        onClick={() => setData({ ...data, diabetesType: 'type2' })}
                    />
                    <PillTag
                        label="Gestacional"
                        isSelected={data.diabetesType === 'gestational'}
                        onClick={() => setData({ ...data, diabetesType: 'gestational' })}
                    />
                    <PillTag
                        label="Pré-diabetes"
                        isSelected={data.diabetesType === 'prediabetes'}
                        onClick={() => setData({ ...data, diabetesType: 'prediabetes' })}
                    />
                    <PillTag
                        label="Não sei"
                        isSelected={data.diabetesType === 'unknown'}
                        onClick={() => setData({ ...data, diabetesType: 'unknown' })}
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-field">
                    <label>Ano Diagnóstico</label>
                    <input
                        type="number"
                        value={data.diagnosisYear || ''}
                        onChange={(e) => setData({ ...data, diagnosisYear: e.target.value })}
                        placeholder="2026"
                        min="1900"
                        max={new Date().getFullYear()}
                    />
                </div>

                <div className="form-field">
                    <label>HbA1c Recente (%)</label>
                    <input
                        type="number"
                        value={data.hba1c || ''}
                        onChange={(e) => setData({ ...data, hba1c: e.target.value })}
                        placeholder="7.5"
                        step="0.1"
                    />
                </div>
            </div>
        </div>
    </div>
);

// ============================================================================
// STEP 3: DADOS FÍSICOS
// ============================================================================

export const Step3: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Activity className="step-icon" />
            <h2>3. Dados Físicos</h2>
        </div>

        <div className="form-section">
            <div className="form-row">
                <div className="form-field">
                    <label>Peso (kg)</label>
                    <input
                        type="number"
                        value={data.weight || ''}
                        onChange={(e) => setData({ ...data, weight: e.target.value })}
                        placeholder="70"
                        step="0.1"
                    />
                </div>

                <div className="form-field">
                    <label>Altura (m)</label>
                    <input
                        type="number"
                        value={data.height || ''}
                        onChange={(e) => setData({ ...data, height: e.target.value })}
                        placeholder="1.70"
                        step="0.01"
                    />
                </div>
            </div>
        </div>
    </div>
);

// ============================================================================
// STEP 4: PARÂMETROS
// ============================================================================

export const Step4: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Activity className="step-icon" />
            <h2>4. Parâmetros</h2>
        </div>

        <div className="form-section">
            <div className="section-subtitle">CÁLCULO AUTOMÁTICO (SE NÃO SOUBER)</div>
            <div className="form-row">
                <div className="form-field">
                    <input
                        type="number"
                        value={data.totalBasal || ''}
                        onChange={(e) => setData({ ...data, totalBasal: e.target.value })}
                        placeholder="Total Basal"
                    />
                </div>
                <div className="form-field">
                    <input
                        type="number"
                        value={data.totalBolus || ''}
                        onChange={(e) => setData({ ...data, totalBolus: e.target.value })}
                        placeholder="Total Bolus"
                    />
                </div>
            </div>

            <div className="form-field">
                <label>Ratio IC (I:g)</label>
                <div className="input-with-button">
                    <input
                        type="number"
                        value={data.ratioIC || ''}
                        onChange={(e) => setData({ ...data, ratioIC: e.target.value })}
                        placeholder="Sei"
                    />
                    <button type="button" className="calc-button">Calcular</button>
                </div>
            </div>

            <div className="form-field">
                <label>Fator Correção (mg/dL)</label>
                <div className="input-with-button">
                    <input
                        type="number"
                        value={data.correctionFactor || ''}
                        onChange={(e) => setData({ ...data, correctionFactor: e.target.value })}
                        placeholder="Sei"
                    />
                    <button type="button" className="calc-button">Calcular</button>
                </div>
            </div>

            <div className="section-subtitle">Metas Glicêmicas</div>
            <div className="form-row">
                <div className="form-field">
                    <label className="small-label">PRÉ-REFEIÇÃO</label>
                    <input
                        type="number"
                        value={data.targetGlucosePreMeal || '100'}
                        onChange={(e) => setData({ ...data, targetGlucosePreMeal: e.target.value })}
                    />
                </div>
                <div className="form-field">
                    <label className="small-label">PÓS-REFEIÇÃO</label>
                    <input
                        type="number"
                        value={data.targetGlucosePostMeal || '140'}
                        onChange={(e) => setData({ ...data, targetGlucosePostMeal: e.target.value })}
                    />
                </div>
            </div>
        </div>
    </div>
);

// ============================================================================
// STEP 5: MONITORAMENTO
// ============================================================================

export const Step5: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Stethoscope className="step-icon" />
            <h2>5. Monitoramento</h2>
        </div>

        <div className="form-section">
            <div className="form-field">
                <label>Frequência de Medição</label>
                <select
                    value={data.measurementFrequency || ''}
                    onChange={(e) => setData({ ...data, measurementFrequency: e.target.value })}
                >
                    <option value="">Selecione...</option>
                    <option value="1-2">1-2 vezes/dia</option>
                    <option value="3-4">3-4 vezes/dia</option>
                    <option value="5+">5+ vezes/dia</option>
                </select>
            </div>

            <div className="form-field">
                <label>Histórico Crítico</label>
                <div className="subsection-label">Hipoglicemia (&lt;70)</div>
                <select
                    value={data.hypoHistory || ''}
                    onChange={(e) => setData({ ...data, hypoHistory: e.target.value })}
                >
                    <option value="">Selecione...</option>
                    <option value="never">Nunca</option>
                    <option value="rare">Raramente</option>
                    <option value="sometimes">Às vezes</option>
                    <option value="frequent">Frequente</option>
                </select>
            </div>

            <div className="form-field">
                <div className="subsection-label">Sintomas Hipo</div>
                <div className="pills-container">
                    {['Tremores', 'Suor Frio', 'Confusão', 'Fome', 'Visão Turva'].map(symptom => (
                        <PillTag
                            key={symptom}
                            label={symptom}
                            isSelected={data.hypoSymptoms?.includes(symptom)}
                            onClick={() => {
                                const current = data.hypoSymptoms || [];
                                const updated = current.includes(symptom)
                                    ? current.filter((s: string) => s !== symptom)
                                    : [...current, symptom];
                                setData({ ...data, hypoSymptoms: updated });
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="form-field">
                <div className="subsection-label">Hiperglicemia (&gt;250)</div>
                <select
                    value={data.hyperHistory || ''}
                    onChange={(e) => setData({ ...data, hyperHistory: e.target.value })}
                >
                    <option value="">Selecione...</option>
                    <option value="never">Nunca</option>
                    <option value="rare">Raramente</option>
                    <option value="sometimes">Às vezes</option>
                    <option value="frequent">Frequente</option>
                </select>
            </div>
        </div>
    </div>
);

// ============================================================================
// STEP 6: ALIMENTAÇÃO
// ============================================================================

export const Step6: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Utensils className="step-icon" />
            <h2>6. Alimentação</h2>
        </div>

        <div className="form-section">
            <div className="form-row-3">
                <div className="form-field">
                    <label className="small-label">CAFÉ</label>
                    <div className="time-input">
                        <input
                            type="time"
                            value={data.breakfastTime || '08:00'}
                            onChange={(e) => setData({ ...data, breakfastTime: e.target.value })}
                        />
                        <Clock size={16} className="time-icon" />
                    </div>
                </div>
                <div className="form-field">
                    <label className="small-label">ALMOÇO</label>
                    <div className="time-input">
                        <input
                            type="time"
                            value={data.lunchTime || '12:00'}
                            onChange={(e) => setData({ ...data, lunchTime: e.target.value })}
                        />
                        <Clock size={16} className="time-icon" />
                    </div>
                </div>
                <div className="form-field">
                    <label className="small-label">JANTAR</label>
                    <div className="time-input">
                        <input
                            type="time"
                            value={data.dinnerTime || '19:00'}
                            onChange={(e) => setData({ ...data, dinnerTime: e.target.value })}
                        />
                        <Clock size={16} className="time-icon" />
                    </div>
                </div>
            </div>

            <div className="form-field">
                <label>Dieta Especial?</label>
                <div className="pills-container">
                    {['Low Carb', 'Vegana', 'Mediterrânea', 'Padrão'].map(diet => (
                        <PillTag
                            key={diet}
                            label={diet}
                            isSelected={data.diet === diet}
                            onClick={() => setData({ ...data, diet })}
                        />
                    ))}
                </div>
            </div>

            <div className="form-field">
                <label>Conta Carboidratos?</label>
                <select
                    value={data.countCarbs || ''}
                    onChange={(e) => setData({ ...data, countCarbs: e.target.value })}
                >
                    <option value="">Selecione...</option>
                    <option value="always">Sempre</option>
                    <option value="sometimes">Às vezes</option>
                    <option value="never">Nunca</option>
                </select>
            </div>

            <div className="form-field">
                <label>Alimentos Problemáticos</label>
                <div className="pills-container">
                    {['Pizza', 'Massas', 'Doces', 'Pão', 'Arroz Branco', 'Refrigerante'].map(food => (
                        <PillTag
                            key={food}
                            label={food}
                            isSelected={data.problematicFoods?.includes(food)}
                            onClick={() => {
                                const current = data.problematicFoods || [];
                                const updated = current.includes(food)
                                    ? current.filter((f: string) => f !== food)
                                    : [...current, food];
                                setData({ ...data, problematicFoods: updated });
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// ============================================================================
// STEP 7: ESTILO DE VIDA
// ============================================================================

export const Step7: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Heart className="step-icon" />
            <h2>7. Estilo de Vida</h2>
        </div>

        <div className="form-section">
            <div className="form-field">
                <label>Exercícios</label>
                <select
                    value={data.exercise || ''}
                    onChange={(e) => setData({ ...data, exercise: e.target.value })}
                >
                    <option value="">Selecione...</option>
                    <option value="none">Não pratico</option>
                    <option value="light">Leve (1-2x/semana)</option>
                    <option value="moderate">Moderado (3-4x/semana)</option>
                    <option value="intense">Intenso (5+x/semana)</option>
                </select>
            </div>

            <div className="form-row">
                <div className="form-field">
                    <label>Fuma?</label>
                    <select
                        value={data.smoking || ''}
                        onChange={(e) => setData({ ...data, smoking: e.target.value })}
                    >
                        <option value="">Selecione...</option>
                        <option value="no">Não</option>
                        <option value="yes">Sim</option>
                        <option value="former">Ex-fumante</option>
                    </select>
                </div>

                <div className="form-field">
                    <label>Álcool?</label>
                    <select
                        value={data.alcohol || ''}
                        onChange={(e) => setData({ ...data, alcohol: e.target.value })}
                    >
                        <option value="">Selecione...</option>
                        <option value="no">Não</option>
                        <option value="occasional">Ocasional</option>
                        <option value="regular">Regular</option>
                    </select>
                </div>
            </div>

            <div className="form-field">
                <label>Qualidade do Sono</label>
                <select
                    value={data.sleepQuality || ''}
                    onChange={(e) => setData({ ...data, sleepQuality: e.target.value })}
                >
                    <option value="">Selecione...</option>
                    <option value="poor">Ruim</option>
                    <option value="fair">Regular</option>
                    <option value="good">Bom</option>
                    <option value="excellent">Durmo bem</option>
                </select>
            </div>
        </div>
    </div>
);

// ============================================================================
// STEP 8: SAÚDE & MEDS
// ============================================================================

export const Step8: React.FC<StepProps> = ({ data, setData }) => (
    <div className="wizard-step">
        <div className="step-header">
            <Pill className="step-icon" />
            <h2>8. Saúde &amp; Meds</h2>
        </div>

        <div className="form-section">
            <div className="form-field">
                <label>Medicamentos Diabetes (Não Insulina)</label>
                <div className="pills-container">
                    {['Metformina', 'Jardiance', 'Ozempic', 'Gliclazida'].map(med => (
                        <PillTag
                            key={med}
                            label={med}
                            isSelected={data.diabetesMeds?.includes(med)}
                            onClick={() => {
                                const current = data.diabetesMeds || [];
                                const updated = current.includes(med)
                                    ? current.filter((m: string) => m !== med)
                                    : [...current, med];
                                setData({ ...data, diabetesMeds: updated });
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="form-field">
                <label>Meds que Afetam Glicemia</label>
                <div className="pills-container">
                    {['Corticoides', 'Anticonvulsivantes', 'Antibióticos'].map(med => (
                        <PillTag
                            key={med}
                            label={med}
                            isSelected={data.glycemicMeds?.includes(med)}
                            onClick={() => {
                                const current = data.glycemicMeds || [];
                                const updated = current.includes(med)
                                    ? current.filter((m: string) => m !== med)
                                    : [...current, med];
                                setData({ ...data, glycemicMeds: updated });
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="form-field">
                <label>Comorbidades</label>
                <div className="pills-container">
                    {['Hipertensão', 'Colesterol', 'Neuropatia', 'Retinopatia', 'Doença Renal'].map(comorb => (
                        <PillTag
                            key={comorb}
                            label={comorb}
                            isSelected={data.comorbidities?.includes(comorb)}
                            onClick={() => {
                                const current = data.comorbidities || [];
                                const updated = current.includes(comorb)
                                    ? current.filter((c: string) => c !== comorb)
                                    : [...current, comorb];
                                setData({ ...data, comorbidities: updated });
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);
