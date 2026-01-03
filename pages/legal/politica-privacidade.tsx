// OS-15: Política de Privacidade
// Página Legal Estática (LGPD Compliance)
// Data: 2026-01-03

import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PoliticaPrivacidade() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
                {/* Header */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6"
                >
                    <ArrowLeft size={20} />
                    Voltar
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <Shield className="text-teal-600" size={32} />
                    <h1 className="text-4xl font-bold text-gray-900">Política de Privacidade</h1>
                </div>
                <p className="text-sm text-gray-500 mb-8">
                    Última atualização: 03 de janeiro de 2026 • Versão 1.0 • Conforme LGPD (Lei 13.709/2018)
                </p>

                <div className="prose prose-teal max-w-none">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                        <p className="text-sm text-blue-900">
                            <strong>Compromisso com a LGPD:</strong> Esta Política de Privacidade foi elaborada
                            em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) e
                            descreve como coletamos, usamos e protegemos seus dados pessoais e sensíveis.
                        </p>
                    </div>

                    <h2>1. Dados Coletados</h2>
                    <p>O GlucoAI coleta os seguintes tipos de dados:</p>

                    <h3>1.1. Dados Pessoais (Art. 5º, I da LGPD)</h3>
                    <ul>
                        <li>Nome completo</li>
                        <li>Email</li>
                        <li>Número de telefone (WhatsApp)</li>
                        <li>Data de nascimento</li>
                    </ul>

                    <h3>1.2. Dados Sensíveis de Saúde (Art. 5º, II da LGPD)</h3>
                    <p className="bg-amber-50 border-l-4 border-amber-500 p-4">
                        <strong>Atenção:</strong> Os seguintes dados são considerados <strong>dados sensíveis</strong>
                        pela LGPD e requerem seu consentimento explícito:
                    </p>
                    <ul>
                        <li>Leituras de glicemia</li>
                        <li>Doses de insulina aplicadas</li>
                        <li>Tipo de diabetes</li>
                        <li>Peso e altura</li>
                        <li>Histórico de refeições e carboidratos</li>
                        <li>Metas glicêmicas</li>
                    </ul>

                    <h2>2. Base Legal para Tratamento (Art. 7º da LGPD)</h2>
                    <p>Tratamos seus dados com base nas seguintes hipóteses legais:</p>
                    <ul>
                        <li><strong>Consentimento (Art. 7º, I):</strong> Você forneceu consentimento explícito
                            ao aceitar esta Política de Privacidade</li>
                        <li><strong>Execução de Contrato (Art. 7º, V):</strong> Necessário para fornecer
                            o serviço de monitoramento glicêmico</li>
                        <li><strong>Tutela da Saúde (Art. 11, II, f):</strong> Dados sensíveis processados
                            para fins de prevenção e promoção da saúde</li>
                    </ul>

                    <h2>3. Finalidade do Tratamento</h2>
                    <p>Usamos seus dados para:</p>
                    <ul>
                        <li>Fornecer sugestões de doses de insulina via IA</li>
                        <li>Monitorar seu histórico glicêmico</li>
                        <li>Gerar gráficos e relatórios de tendências</li>
                        <li>Enviar notificações e lembretes via WhatsApp</li>
                        <li>Processar pagamentos de assinatura</li>
                        <li>Melhorar nossos algoritmos de IA (dados anonimizados)</li>
                    </ul>

                    <h2>4. Compartilhamento de Dados (Sub-processadores)</h2>
                    <p>
                        Seus dados podem ser compartilhados com os seguintes sub-processadores,
                        todos em conformidade com a LGPD:
                    </p>

                    <h3>4.1. Supabase (Armazenamento de Dados)</h3>
                    <ul>
                        <li>Localização: Estados Unidos (com cláusulas contratuais padrão)</li>
                        <li>Finalidade: Armazenamento seguro de dados</li>
                        <li>Política: <a href="https://supabase.com/privacy" target="_blank" className="text-teal-600">supabase.com/privacy</a></li>
                    </ul>

                    <h3>4.2. OpenAI/Google Gemini (Processamento de IA)</h3>
                    <ul>
                        <li>Finalidade: Análise de mensagens e geração de sugestões</li>
                        <li><strong>Importante:</strong> Dados enviados são processados de forma efêmera
                            (não armazenados permanentemente pela IA)</li>
                    </ul>

                    <h3>4.3. Stripe (Processamento de Pagamentos)</h3>
                    <ul>
                        <li>Finalidade: Cobranças de assinatura</li>
                        <li>Dados compartilhados: Nome, email, dados de cartão (criptografados)</li>
                    </ul>

                    <h3>4.4. Meta Inc. (WhatsApp)</h3>
                    <ul>
                        <li>Finalidade: Envio e recebimento de mensagens</li>
                        <li><strong>Importante:</strong> Ao usar o WhatsApp, você está sujeito às
                            políticas de privacidade da Meta</li>
                    </ul>

                    <h2>5. Seus Direitos (Art. 18 da LGPD)</h2>
                    <p>Você tem os seguintes direitos sobre seus dados:</p>
                    <ul>
                        <li><strong>Confirmação e Acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
                        <li><strong>Correção:</strong> Corrigir dados incompletos ou desatualizados</li>
                        <li><strong>Anonimização ou Bloqueio:</strong> Solicitar anonimização ou bloqueio</li>
                        <li><strong>Eliminação:</strong> Solicitar exclusão de dados desnecessários</li>
                        <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
                        <li><strong>Revogação do Consentimento:</strong> Retirar consentimento a qualquer momento</li>
                    </ul>

                    <p>
                        Para exercer seus direitos, entre em contato:
                        <a href="mailto:privacidade@glucoai.com" className="text-teal-600 ml-1">
                            privacidade@glucoai.com
                        </a>
                    </p>

                    <h2>6. Segurança dos Dados</h2>
                    <p>Implementamos as seguintes medidas de segurança:</p>
                    <ul>
                        <li>Criptografia em trânsito (HTTPS/TLS)</li>
                        <li>Criptografia em repouso (banco de dados)</li>
                        <li>Autenticação de dois fatores (2FA) disponível</li>
                        <li>Backups regulares e redundância de dados</li>
                        <li>Logs de auditoria para rastreamento de acessos</li>
                    </ul>

                    <h2>7. Retenção de Dados</h2>
                    <p>Retemos seus dados:</p>
                    <ul>
                        <li><strong>Durante assinatura ativa:</strong> Todos os dados são mantidos</li>
                        <li><strong>Após cancelamento:</strong> Dados mantidos por 90 dias para possível reativação</li>
                        <li><strong>Após exclusão de conta:</strong> Dados anonimizados para análises estatísticas</li>
                    </ul>

                    <h2>8. Cookies e Rastreamento</h2>
                    <p>
                        Usamos cookies essenciais para autenticação e funcionamento do serviço.
                        Não usamos cookies de rastreamento ou publicidade.
                    </p>

                    <h2>9. Encarregado de Dados (DPO)</h2>
                    <p>
                        Nosso Encarregado de Proteção de Dados (DPO) pode ser contatado em:
                        <br />
                        Email: <a href="mailto:dpo@glucoai.com" className="text-teal-600">dpo@glucoai.com</a>
                    </p>

                    <h2>10. Alterações nesta Política</h2>
                    <p>
                        Podemos atualizar esta Política de Privacidade periodicamente. Você será notificado
                        sobre mudanças significativas e precisará aceitar a nova versão.
                    </p>

                    <h2>11. Contato</h2>
                    <p>
                        Para dúvidas sobre privacidade e proteção de dados:
                        <br />
                        Email: <a href="mailto:privacidade@glucoai.com" className="text-teal-600">privacidade@glucoai.com</a>
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                        © 2026 GlucoAI. Todos os direitos reservados. • Conforme LGPD (Lei 13.709/2018)
                    </p>
                </div>
            </div>
        </div>
    );
}
