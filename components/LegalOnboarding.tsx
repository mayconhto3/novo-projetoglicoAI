// OS-15: Legal Onboarding Component
// Responsabilidade: Coletar consentimento granular obrigatório (LGPD)
// Autor: Squad Frontend
// Data: 2026-01-03

import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Shield, FileText, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface LegalOnboardingProps {
    userId: string;
    onComplete: () => void;
}

export const LegalOnboarding: React.FC<LegalOnboardingProps> = ({ userId, onComplete }) => {
    const [consents, setConsents] = useState({
        medical: false,
        whatsapp: false,
        privacy: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Validação: todos os 3 checkboxes devem estar marcados
    const allAccepted = consents.medical && consents.whatsapp && consents.privacy;

    const handleCheckboxChange = (type: 'medical' | 'whatsapp' | 'privacy') => {
        setConsents(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const handleComplete = async () => {
        if (!allAccepted) return;

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    terms_accepted_at: new Date().toISOString(),
                    terms_version: 'v1.0',
                    medical_disclaimer_accepted: true,
                    privacy_policy_accepted: true,
                    whatsapp_consent_accepted: true
                })
                .eq('id', userId);

            if (updateError) throw updateError;

            console.log('[LegalOnboarding] Termos aceitos com sucesso');
            onComplete();
        } catch (err) {
            console.error('[LegalOnboarding] Erro ao salvar aceite:', err);
            setError('Erro ao salvar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
                        <Shield className="text-teal-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Termos de Uso e Consentimento
                    </h1>
                    <p className="text-gray-600">
                        Para sua segurança e proteção legal, precisamos do seu consentimento explícito
                    </p>
                </div>

                {/* Alert de Obrigatoriedade */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded">
                    <div className="flex items-start">
                        <AlertTriangle className="text-amber-500 mr-3 flex-shrink-0" size={20} />
                        <p className="text-sm text-amber-800">
                            <strong>Atenção:</strong> Você precisa aceitar todos os termos abaixo para continuar usando o GlucoAI.
                        </p>
                    </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-6 mb-8">

                    {/* Checkbox 1: Disclaimer Médico */}
                    <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-teal-300 transition-colors">
                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={consents.medical}
                                onChange={() => handleCheckboxChange('medical')}
                                className="mt-1 w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            />
                            <div className="ml-4 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="text-red-500" size={20} />
                                    <h3 className="font-bold text-gray-900">Disclaimer Médico</h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Declaro estar ciente de que o <strong>GlucoAI NÃO É um médico</strong>.
                                    Entendo que a IA oferece apenas <strong>sugestões educativas</strong>.
                                    Comprometo-me a <strong>conferir cálculos manualmente</strong> e
                                    consultar meu médico antes de aplicar doses.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Checkbox 2: WhatsApp/Meta */}
                    <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-teal-300 transition-colors">
                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={consents.whatsapp}
                                onChange={() => handleCheckboxChange('whatsapp')}
                                className="mt-1 w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            />
                            <div className="ml-4 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageCircle className="text-green-500" size={20} />
                                    <h3 className="font-bold text-gray-900">Infraestrutura WhatsApp</h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Autorizo o processamento de dados via WhatsApp. Estou ciente de que,
                                    ao usar o WhatsApp, minhas mensagens <strong>trafegam pela infraestrutura
                                        da Meta Inc.</strong>, sujeita às suas próprias políticas de privacidade.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Checkbox 3: LGPD e Privacidade */}
                    <div className="border-2 border-gray-200 rounded-xl p-5 hover:border-teal-300 transition-colors">
                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={consents.privacy}
                                onChange={() => handleCheckboxChange('privacy')}
                                className="mt-1 w-5 h-5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            />
                            <div className="ml-4 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="text-blue-500" size={20} />
                                    <h3 className="font-bold text-gray-900">LGPD e Privacidade</h3>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Li e concordo com os{' '}
                                    <a
                                        href="/legal/termos-de-uso"
                                        target="_blank"
                                        className="text-teal-600 underline hover:text-teal-700"
                                    >
                                        Termos de Uso
                                    </a>
                                    {' '}e{' '}
                                    <a
                                        href="/legal/politica-privacidade"
                                        target="_blank"
                                        className="text-teal-600 underline hover:text-teal-700"
                                    >
                                        Política de Privacidade
                                    </a>
                                    . Concordo com a <strong>coleta de dados de saúde</strong> para
                                    monitoramento glicêmico conforme a LGPD.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Botão de Conclusão */}
                <button
                    onClick={handleComplete}
                    disabled={!allAccepted || loading}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${allAccepted && !loading
                            ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg hover:shadow-xl'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Salvando...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={24} />
                            {allAccepted ? 'Concluir Cadastro' : 'Aceite todos os termos para continuar'}
                        </>
                    )}
                </button>

                {/* Footer Legal */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Ao clicar em "Concluir Cadastro", você confirma que leu e entendeu todos os termos acima.
                        <br />
                        Versão dos Termos: <strong>v1.0</strong> • Data: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>
        </div>
    );
};
