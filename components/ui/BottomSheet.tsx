// OS-16: Bottom Sheet Component (Mobile)
// Responsabilidade: Modal deslizante de baixo para cima (mobile-friendly)
// Data: 2026-01-03

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    children,
    title
}) => {
    // Prevenir scroll do body quando aberto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="bottom-sheet-backdrop"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet */}
            <div
                className="bottom-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            >
                {/* Handle (Indicador visual de arrasto) */}
                <div className="bottom-sheet-handle" />

                {/* Header */}
                {title && (
                    <div className="bottom-sheet-header">
                        <h3 id="bottom-sheet-title" className="bottom-sheet-title">
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            className="bottom-sheet-close"
                            aria-label="Fechar"
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="bottom-sheet-content">
                    {children}
                </div>
            </div>

            <style>{`
        .bottom-sheet-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: var(--z-modal-backdrop);
          animation: fadeIn 300ms ease;
        }

        .bottom-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.2);
          z-index: var(--z-modal);
          max-height: 85vh; /* IMPORTANTE: Não cobre 100% da tela */
          display: flex;
          flex-direction: column;
          animation: slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .bottom-sheet-handle {
          width: 40px;
          height: 4px;
          background: var(--color-gray-300);
          border-radius: 999px;
          margin: 12px auto 8px;
          flex-shrink: 0;
        }

        .bottom-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--color-gray-200);
          flex-shrink: 0;
        }

        .bottom-sheet-title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-gray-900);
          margin: 0;
        }

        .bottom-sheet-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: var(--color-gray-500);
          transition: color var(--transition-fast);
          border-radius: var(--radius-md);
        }

        .bottom-sheet-close:hover {
          color: var(--color-gray-900);
          background: var(--color-gray-100);
        }

        .bottom-sheet-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
        </>
    );
};
