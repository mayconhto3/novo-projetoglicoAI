// OS-16: Exemplo de Uso do InfoTooltip
// Demonstração de como integrar tooltips em formulários
// Data: 2026-01-03

import React from 'react';
import { InfoTooltip } from '../components/ui/InfoTooltip';

export const QuestionnaireFieldExample = () => {
    return (
        <div className="form-section">
            <h2>Configurações de Insulina</h2>

            {/* Exemplo 1: Ratio IC */}
            <div className="field-group">
                <label htmlFor="ratioIC">
                    Ratio IC (Café da Manhã)
                    <InfoTooltip tooltipKey="ratioIC" />
                </label>
                <input
                    id="ratioIC"
                    type="number"
                    placeholder="Ex: 10"
                    step="0.5"
                />
                <p className="field-hint">
                    Quanto 1 unidade de insulina cobre de carboidrato
                </p>
            </div>

            {/* Exemplo 2: ISF */}
            <div className="field-group">
                <label htmlFor="isf">
                    Sensibilidade (ISF)
                    <InfoTooltip tooltipKey="isf" />
                </label>
                <input
                    id="isf"
                    type="number"
                    placeholder="Ex: 50"
                    step="5"
                />
                <p className="field-hint">
                    Quanto 1 unidade baixa sua glicemia
                </p>
            </div>

            {/* Exemplo 3: Meta Glicêmica */}
            <div className="field-group">
                <label htmlFor="targetGlucose">
                    Meta Glicêmica Pré-Refeição
                    <InfoTooltip tooltipKey="targetGlucosePreMeal" />
                </label>
                <div className="range-input">
                    <input
                        type="number"
                        placeholder="Mín: 80"
                    />
                    <span>até</span>
                    <input
                        type="number"
                        placeholder="Máx: 120"
                    />
                    <span>mg/dL</span>
                </div>
            </div>

            {/* Exemplo 4: Precisão de Insulina */}
            <div className="field-group">
                <label htmlFor="insulinStep">
                    Precisão da Dose
                    <InfoTooltip tooltipKey="insulinStep" />
                </label>
                <select id="insulinStep">
                    <option value="1.0">1.0 unidade (Caneta padrão)</option>
                    <option value="0.5">0.5 unidade (Pediátrico)</option>
                    <option value="0.1">0.1 unidade (Bomba de insulina)</option>
                </select>
            </div>

            <style>{`
        .form-section {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .field-group {
          margin-bottom: 24px;
        }

        label {
          display: flex;
          align-items: center;
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-medium);
          color: var(--color-gray-700);
          margin-bottom: 8px;
        }

        input,
        select {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--color-gray-200);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-base);
          transition: all var(--transition-fast);
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px rgba(2, 148, 145, 0.1);
        }

        .field-hint {
          margin-top: 6px;
          font-size: var(--font-size-xs);
          color: var(--color-gray-500);
        }

        .range-input {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .range-input input {
          flex: 1;
        }

        .range-input span {
          color: var(--color-gray-500);
          font-size: var(--font-size-sm);
        }
      `}</style>
        </div>
    );
};
