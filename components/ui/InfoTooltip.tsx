// OS-16: InfoTooltip Component
// Responsabilidade: Ícone de informação com tooltip contextual
// Data: 2026-01-03

import React, { useState, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Popover } from './Popover';
import { getTooltip, TooltipContent as TooltipData } from '../../constants/tooltips';

interface InfoTooltipProps {
    tooltipKey: string;
    className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ tooltipKey, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const tooltipData = getTooltip(tooltipKey);

    if (!tooltipData) {
        console.warn(`[InfoTooltip] Tooltip não encontrado: ${tooltipKey}`);
        return null;
    }

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(true)}
                className={`info-tooltip-trigger ${className}`}
                aria-label="Mais informações"
                type="button"
            >
                <HelpCircle size={18} />
            </button>

            {isMobile ? (
                <BottomSheet
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title={tooltipData.title}
                >
                    <TooltipContent data={tooltipData} />
                </BottomSheet>
            ) : (
                <Popover
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    anchorEl={buttonRef.current}
                    title={tooltipData.title}
                >
                    <TooltipContent data={tooltipData} />
                </Popover>
            )}

            <style>{`
        .info-tooltip-trigger {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--color-primary);
          transition: all var(--transition-fast);
          border-radius: var(--radius-sm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          vertical-align: middle;
          margin-left: 4px;
        }

        .info-tooltip-trigger:hover {
          color: var(--color-primary-dark);
          background: rgba(2, 148, 145, 0.1);
          transform: scale(1.1);
        }

        .info-tooltip-trigger:active {
          transform: scale(0.95);
        }
      `}</style>
        </>
    );
};

// Componente interno para conteúdo do tooltip
const TooltipContent: React.FC<{ data: TooltipData }> = ({ data }) => {
    return (
        <div className="tooltip-content">
            <p className="tooltip-description">{data.content}</p>

            {data.example && (
                <div className="tooltip-example">
                    <strong className="example-label">Exemplo:</strong>
                    <p className="example-text">{data.example}</p>
                </div>
            )}

            {data.learnMore && (
                <div className="tooltip-learn-more">
                    <p className="learn-more-text">{data.learnMore}</p>
                </div>
            )}

            <style>{`
        .tooltip-content {
          font-size: var(--font-size-sm);
          line-height: var(--line-height-relaxed);
        }

        .tooltip-description {
          color: var(--color-gray-700);
          margin: 0 0 12px 0;
        }

        .tooltip-example {
          background: var(--color-gray-50);
          border-left: 3px solid var(--color-primary);
          padding: 12px;
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }

        .example-label {
          display: block;
          color: var(--color-primary);
          font-weight: var(--font-weight-semibold);
          margin-bottom: 4px;
          font-size: var(--font-size-xs);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .example-text {
          color: var(--color-gray-700);
          margin: 0;
        }

        .tooltip-learn-more {
          background: linear-gradient(135deg, #029491 0%, #56da98 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(2, 148, 145, 0.2);
        }

        .learn-more-text {
          margin: 0;
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-medium);
        }
      `}</style>
        </div>
    );
};
