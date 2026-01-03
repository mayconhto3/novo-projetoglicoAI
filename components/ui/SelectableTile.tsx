// OS-16 UX Revision: SelectableTile Component
// Responsabilidade: Card interativo para seleção visual (substitui radio/select)
// Data: 2026-01-03
// Padrão: Duolingo/Airbnb/Uber

import React from 'react';
import { Check } from 'lucide-react';

interface SelectableTileProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export const SelectableTile: React.FC<SelectableTileProps> = ({
  icon,
  title,
  description,
  isSelected,
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`selectable-tile ${isSelected ? 'selected' : ''} ${className}`}
      type="button"
    >
      {/* Ícone */}
      {icon && (
        <div className="tile-icon">
          {icon}
        </div>
      )}

      {/* Conteúdo */}
      <div className="tile-content">
        <h3 className="tile-title">{title}</h3>
        {description && (
          <p className="tile-description">{description}</p>
        )}
      </div>

      {/* Check Mark (quando selecionado) */}
      {isSelected && (
        <div className="tile-check">
          <Check size={14} strokeWidth={2.5} />
        </div>
      )}

      <style jsx>{`
        .selectable-tile {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          padding: 14px 16px;
          min-height: 56px;
          background: white;
          border: 1.5px solid var(--color-gray-200);
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
          width: 100%;
        }

        /* Hover State */
        .selectable-tile:hover {
          border-color: var(--color-primary);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        /* Active State (Clique) */
        .selectable-tile:active {
          transform: scale(0.98);
        }

        /* Selected State */
        .selectable-tile.selected {
          border-color: var(--color-primary);
          border-width: 2px;
          background: rgba(2, 148, 145, 0.04);
          box-shadow: 0 2px 8px rgba(2, 148, 145, 0.12);
        }

        /* Ícone */
        .tile-icon {
          color: var(--color-gray-500);
          transition: color var(--transition-fast);
          flex-shrink: 0;
        }

        .selectable-tile.selected .tile-icon {
          color: var(--color-primary);
        }

        /* Conteúdo */
        .tile-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .tile-title {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          color: var(--color-gray-900);
          margin: 0;
          line-height: 1.4;
        }

        .tile-description {
          font-size: var(--font-size-xs);
          color: var(--color-gray-500);
          margin: 0;
          line-height: 1.3;
        }

        /* Check Mark */
        .tile-check {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          background: var(--color-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          animation: checkPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes checkPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Responsividade */
        @media (max-width: 640px) {
          .selectable-tile {
            padding: 12px 14px;
            min-height: 52px;
          }

          .tile-title {
            font-size: var(--font-size-sm);
          }

          .tile-description {
            font-size: 11px;
          }
        }
      `}</style>
    </button>
  );
};
