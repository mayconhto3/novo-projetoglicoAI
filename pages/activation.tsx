import React from 'react';
import { MessageCircle, ArrowRight, Check } from 'lucide-react';

export const ActivationPage: React.FC<{ onSkip?: () => void }> = ({ onSkip }) => {

    // Configurações do WhatsApp
    const WHATSAPP_NUMBER = '5563981399119';
    const ACTIVATION_MESSAGE = 'Olá! Acabei de criar meu perfil e quero ativar minha conta.';
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(ACTIVATION_MESSAGE)}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#029491] to-[#0d4a4b] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center space-y-6 animate-fade-in">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce-once">
                    <Check size={48} className="text-white" strokeWidth={3} />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white">
                    ✅ Tudo Pronto!
                </h1>

                {/* Description */}
                <p className="text-white/90 text-lg leading-relaxed">
                    Seu perfil foi criado com sucesso! Para começar a usar sua <span className="font-bold text-green-300">IA pessoal de diabetes</span>, ative agora no WhatsApp.
                </p>

                {/* Main CTA */}
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                    <div className="flex items-center justify-center gap-3">
                        <MessageCircle size={24} />
                        <span>ATIVAR GLICIE NO WHATSAPP</span>
                    </div>
                </a>

                {/* Info Tip */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-white/70 text-sm">
                        💡 <span className="font-semibold">Dica:</span> Ao clicar, o WhatsApp abrirá com a mensagem pronta. Basta enviar!
                    </p>
                </div>

                {/* Secondary CTA */}
                <button
                    onClick={onSkip}
                    className="w-full text-white/60 hover:text-white py-3 transition-all flex items-center justify-center gap-2 group"
                >
                    <span>Já ativei / Ir para Dashboard</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* WhatsApp Number */}
                <p className="text-white/30 text-xs">
                    📱 Número: +55 63 98139-9119
                </p>
            </div>

            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes bounce-once {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }

                .animate-bounce-once {
                    animation: bounce-once 1s ease-in-out;
                }
            `}</style>
        </div>
    );
};
