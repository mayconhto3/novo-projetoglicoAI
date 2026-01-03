// OS-16 UX Revision: PillTag Component
// Responsabilidade: Tag clicável estilo "pill" para seleção múltipla
// Data: 2026-01-03
// Padrão: Clean form design

import React from 'react';

interface PillTagProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

export const PillTag: React.FC<PillTagProps> = ({ label, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`pill-tag ${isSelected ? 'selected' : ''}`}
      type="button"
    >
      {label}

      <style jsx>{`
        .pill-tag {
          display: inline-flex;
          align-items: center;
          padding: 10px 18px;
          border: 2px solid #d1d5db;
          border-radius: 20px;
          background: #f9fafb;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .pill-tag:hover:not(.selected) {
          border-color: #9ca3af;
          background: #f3f4f6;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .pill-tag.selected {
          border-color: #029491;
          background: linear-gradient(135deg, #029491 0%, #027c7a 100%);
          color: #ffffff;
          font-weight: 600;
          box-shadow: 0 3px 8px rgba(2, 148, 145, 0.4);
          transform: scale(1.02);
        }

        .pill-tag.selected:hover {
          background: linear-gradient(135deg, #027c7a 0%, #026663 100%);
          box-shadow: 0 4px 10px rgba(2, 148, 145, 0.5);
        }

        @media (max-width: 640px) {
          .pill-tag {
            padding: 8px 14px;
            font-size: 13px;
          }
        }
      `}</style>
    </button>
  );
};
