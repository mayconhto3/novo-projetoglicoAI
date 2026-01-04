import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

// ============================================================================
// DICIONÁRIO DE EXPLICAÇÕES
// ============================================================================

export const FIELD_EXPLANATIONS = {
    hba1c: {
        title: "HbA1c (Hemoglobina Glicada)",
        content: "É a média da sua glicemia nos últimos 3 meses.\n\n📊 Valores de referência:\n• Normal: abaixo de 5.7%\n• Pré-diabetes: 5.7% a 6.4%\n• Diabetes: acima de 6.5%\n• Meta para diabéticos: abaixo de 7%"
    },
    ratioIC: {
        title: "Ratio IC (Insulina:Carboidrato)",
        content: "É a quantidade de carboidratos que 1 unidade de insulina consegue cobrir.\n\n💉 Exemplo prático:\n• Ratio 1:10 → 1 unidade cobre 10g de carboidrato\n• Vai comer 50g de carbo?\n• Precisa de: 50 ÷ 10 = 5 unidades\n\n📝 Seu médico calcula isso baseado no seu peso e sensibilidade à insulina."
    },
    correctionFactor: {
        title: "Fator de Sensibilidade (ISF)",
        content: "Quanto 1 unidade de insulina abaixa sua glicemia.\n\n💉 Exemplo prático:\n• ISF 50 → 1 unidade abaixa 50 mg/dL\n• Glicemia atual: 200 mg/dL\n• Meta: 100 mg/dL\n• Diferença: 200 - 100 = 100\n• Insulina necessária: 100 ÷ 50 = 2 unidades\n\n⚠️ Use apenas se orientado pelo médico!"
    },
    targetPreMeal: {
        title: "Meta Pré-Refeição",
        content: "Glicemia ideal ANTES de comer.\n\n🎯 Valores recomendados:\n• Adultos: 80-130 mg/dL\n• Crianças: 90-130 mg/dL\n• Gestantes: 60-99 mg/dL\n\n📋 Seu médico pode ter definido uma meta específica para você."
    },
    targetPostMeal: {
        title: "Meta Pós-Refeição",
        content: "Glicemia ideal 2 horas DEPOIS de comer.\n\n🎯 Valores recomendados:\n• Adultos: abaixo de 180 mg/dL\n• Gestantes: abaixo de 140 mg/dL\n\n📊 Ajuda a avaliar se a dose de insulina foi adequada para a refeição."
    },
    insulinMethod: {
        title: "Método de Aplicação",
        content: "Como você aplica insulina:\n\n💉 Caneta:\n• Dispositivo reutilizável com refil\n• Fácil de usar e transportar\n• Mais comum\n\n🩸 Seringa:\n• Aplicação manual tradicional\n• Permite doses mais precisas\n• Mais econômica\n\n⚙️ Bomba:\n• Dispositivo automático contínuo\n• Infusão 24h\n• Maior controle"
    },
    insulinStep: {
        title: "Precisão da Dose",
        content: "Menor dose que seu dispositivo permite:\n\n💉 1 unidade (1u):\n• Canetas padrão\n• Doses inteiras (1u, 2u, 3u...)\n• Mais comum em adultos\n\n💉 0.5 unidades (0.5u):\n• Canetas pediátricas\n• Permite meio unidade (0.5u, 1u, 1.5u...)\n• Ideal para crianças ou doses baixas\n\n🤖 A IA arredondará sugestões conforme sua precisão."
    },
    basalBrand: {
        title: "Marca da Insulina Basal",
        content: "Nome da sua insulina de ação prolongada (basal).\n\n💊 Exemplos comuns:\n• Lantus (glargina)\n• Tresiba (degludeca)\n• Levemir (detemir)\n• Toujeo (glargina concentrada)\n\n📋 Ajuda a IA a entender seu tratamento completo e fazer sugestões mais personalizadas."
    },
    measurementFrequency: {
        title: "Frequência de Medição",
        content: "Quantas vezes por dia você mede sua glicemia.\n\n📊 Recomendações típicas:\n• Tipo 1: 4-8 vezes/dia\n• Tipo 2 com insulina: 2-4 vezes/dia\n• Tipo 2 sem insulina: 1-2 vezes/dia\n\n✅ Mais medições = melhor controle e ajustes mais precisos da IA."
    },
    mealTimes: {
        title: "Horários de Refeições",
        content: "Seus horários habituais de café, almoço e jantar.\n\n🤖 Como a IA usa isso:\n• Quando você envia foto de comida às 12h, a IA identifica automaticamente como \"Almoço\"\n• Ajuda a dar contexto temporal para sugestões\n• Permite alertas personalizados\n\n⏰ Não precisa ser exato, apenas uma média do seu dia a dia."
    }
};

// ============================================================================
// COMPONENTE INFO TOOLTIP
// ============================================================================

interface InfoTooltipProps {
    title: string;
    content: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Ícone de Info */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(true);
                }}
                className="ml-2 text-[#56da98] hover:text-[#3fb87a] transition-colors inline-flex items-center"
                aria-label="Mais informações"
            >
                <Info size={18} />
            </button>

            {/* Bottom Sheet (Mobile-First) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-end"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-t-3xl p-6 w-full max-h-[80vh] overflow-y-auto animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#029491] pr-8">
                                {title}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Fechar"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="text-gray-700 whitespace-pre-line leading-relaxed mb-6">
                            {content}
                        </div>

                        {/* Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full bg-[#56da98] text-white py-3 rounded-xl font-bold hover:bg-[#3fb87a] transition-colors"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                    }
                    to {
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default InfoTooltip;
