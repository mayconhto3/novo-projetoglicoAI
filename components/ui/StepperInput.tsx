// OS-16 UX Revision: StepperInput Component
// Responsabilidade: Input numérico "Hero" com botões +/- (substitui input type="number")
// Data: 2026-01-03
// Padrão: Mobile-First Tactile

import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface StepperInputProps {
    value: number;
    onChange: (value: number) => void;
    step?: number;
    min?: number;
    max?: number;
    unit?: string;
    label?: string;
    helpText?: string;
}

export const StepperInput: React.FC<StepperInputProps> = ({
    value,
    onChange,
    step = 1,
    min = 0,
    max = 999,
    unit = '',
    label,
    helpText
}) => {
    const handleDecrement = () => {
        const newValue = value - step;
        if (newValue >= min) {
            onChange(newValue);
        }
    };

    const handleIncrement = () => {
        const newValue = value + step;
        if (newValue <= max) {
            onChange(newValue);
        }
    };

    const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value) || 0;
        if (newValue >= min && newValue <= max) {
            onChange(newValue);
        }
    };

    return (
        <div className="stepper-container">
            {/* Label */}
            {label && (
                <label className="stepper-label">{label}</label>
            )}

            {/* Stepper */}
            <div className="stepper-controls">
                {/* Botão Menos */}
                <button
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="stepper-button"
                    type="button"
                    aria-label="Diminuir"
                >
                    <Minus size={28} strokeWidth={3} />
                </button>

                {/* Display Hero */}
                <div className="stepper-display">
                    <input
                        type="number"
                        value={value}
                        onChange={handleDirectInput}
                        className="stepper-input"
                        step={step}
                        min={min}
                        max={max}
                    />
                    {unit && <span className="stepper-unit">{unit}</span>}
                </div>

                {/* Botão Mais */}
                <button
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="stepper-button"
                    type="button"
                    aria-label="Aumentar"
                >
                    <Plus size={28} strokeWidth={3} />
                </button>
            </div>

            {/* Help Text */}
            {helpText && (
                <p className="stepper-help">{helpText}</p>
            )}

            <style>{`
        .stepper-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        /* Label */
        .stepper-label {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-gray-900);
          text-align: center;
        }

        /* Controls */
        .stepper-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        /* Botões */
        .stepper-button {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid var(--color-primary);
          background: white;
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-md);
        }

        .stepper-button:hover:not(:disabled) {
          background: var(--color-primary);
          color: white;
          transform: scale(1.1);
          box-shadow: var(--shadow-lg);
        }

        .stepper-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .stepper-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Display Hero */
        .stepper-display {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          min-width: 180px;
        }

        .stepper-input {
          font-size: 64px;
          font-weight: var(--font-weight-bold);
          color: var(--color-primary);
          text-align: center;
          border: none;
          background: transparent;
          width: 140px;
          outline: none;
          -moz-appearance: textfield;
        }

        .stepper-input::-webkit-inner-spin-button,
        .stepper-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .stepper-unit {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-medium);
          color: var(--color-gray-600);
        }

        /* Help Text */
        .stepper-help {
          font-size: var(--font-size-sm);
          color: var(--color-gray-600);
          text-align: center;
          margin: 0;
        }

        /* Responsividade */
        @media (max-width: 640px) {
          .stepper-button {
            width: 56px;
            height: 56px;
          }

          .stepper-input {
            font-size: 48px;
            width: 100px;
          }

          .stepper-unit {
            font-size: var(--font-size-xl);
          }

          .stepper-controls {
            gap: 16px;
          }
        }
      `}</style>
        </div>
    );
};
