// OS-16: Popover Component (Desktop)
// Responsabilidade: Tooltip flutuante para desktop
// Data: 2026-01-03

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface PopoverProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    anchorEl?: HTMLElement | null;
    title?: string;
}

export const Popover: React.FC<PopoverProps> = ({
    isOpen,
    onClose,
    children,
    anchorEl,
    title
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    // Fechar ao clicar fora
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                anchorEl &&
                !anchorEl.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, anchorEl]);

    // Fechar com ESC
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={popoverRef}
            className="popover"
            role="dialog"
            aria-modal="false"
            aria-labelledby={title ? 'popover-title' : undefined}
        >
            {/* Header */}
            {title && (
                <div className="popover-header">
                    <h4 id="popover-title" className="popover-title">
                        {title}
                    </h4>
                    <button
                        onClick={onClose}
                        className="popover-close"
                        aria-label="Fechar"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="popover-content">
                {children}
            </div>

            <style>{`
        .popover {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--color-gray-200);
          z-index: var(--z-popover);
          min-width: 280px;
          max-width: 360px;
          animation: popoverFadeIn 200ms ease;
        }

        .popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-gray-200);
        }

        .popover-title {
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-gray-900);
          margin: 0;
        }

        .popover-close {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--color-gray-500);
          transition: color var(--transition-fast);
          border-radius: var(--radius-sm);
        }

        .popover-close:hover {
          color: var(--color-gray-900);
          background: var(--color-gray-100);
        }

        .popover-content {
          padding: 16px;
        }

        @keyframes popoverFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
};
