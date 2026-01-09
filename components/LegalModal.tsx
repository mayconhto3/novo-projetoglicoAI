// Componente Modal Genérico para Páginas Legais
// Responsabilidade: Exibir páginas de conformidade em overlay
// Data: 2026-01-09

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// Importar componentes das páginas legais
import TermosDeUso from '../pages/legal/termos-de-uso';
import PoliticaPrivacidade from '../pages/legal/politica-privacidade';
import AvisoMedico from '../pages/legal/aviso-medico';

interface LegalModalProps {
    type: 'termos' | 'privacidade' | 'aviso' | null;
    onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
    // Prevenir scroll do body quando modal está aberto
    useEffect(() => {
        if (type) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [type]);

    // Fechar modal ao pressionar ESC
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (type) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [type, onClose]);

    if (!type) return null;

    const renderContent = () => {
        switch (type) {
            case 'termos':
                return <TermosDeUso />;
            case 'privacidade':
                return <PoliticaPrivacidade />;
            case 'aviso':
                return <AvisoMedico />;
            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'termos':
                return '📜 Termos de Uso';
            case 'privacidade':
                return '🔒 Política de Privacidade';
            case 'aviso':
                return '⚕️ Aviso Médico';
            default:
                return '';
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 z-50 animate-fade-in"
                onClick={onClose}
                aria-label="Fechar modal"
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in pointer-events-auto"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="legal-modal-title"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-white">
                        <h2
                            id="legal-modal-title"
                            className="text-2xl font-bold text-gray-900"
                        >
                            {getTitle()}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Fechar modal de página legal"
                        >
                            <X size={24} className="text-gray-600" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="bg-white rounded-lg p-8 shadow-sm">
                            {renderContent()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }

                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
};
