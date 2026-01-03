// OS-15: Termos de Uso
// Página Legal Estática
// Data: 2026-01-03

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermosDeUso() {
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

                <h1 className="text-4xl font-bold text-gray-900 mb-4">Termos de Uso</h1>
                <p className="text-sm text-gray-500 mb-8">
                    Última atualização: 03 de janeiro de 2026 • Versão 1.0
                </p>

                <div className="prose prose-teal max-w-none">
                    <h2>1. Aceitação dos Termos</h2>
                    <p>
                        Ao acessar e usar o GlucoAI, você concorda em cumprir e estar vinculado aos
                        seguintes Termos de Uso. Se você não concordar com qualquer parte destes termos,
                        não deverá usar nosso serviço.
                    </p>

                    <h2>2. Descrição do Serviço</h2>
                    <p>
                        O GlucoAI é uma ferramenta educativa baseada em Inteligência Artificial que
                        auxilia pessoas com diabetes no monitoramento glicêmico e cálculo de doses de
                        insulina. <strong>O GlucoAI NÃO substitui orientação médica profissional.</strong>
                    </p>

                    <h2>3. Disclaimer Médico</h2>
                    <p className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
                        <strong>IMPORTANTE:</strong> O GlucoAI é uma ferramenta educativa e NÃO é um
                        dispositivo médico. As sugestões fornecidas pela IA são apenas orientações
                        educacionais. Você deve SEMPRE:
                    </p>
                    <ul>
                        <li>Conferir manualmente todos os cálculos sugeridos</li>
                        <li>Consultar seu médico endocrinologista antes de aplicar qualquer dose</li>
                        <li>Seguir as orientações do seu plano de tratamento médico</li>
                        <li>Não tomar decisões médicas baseadas exclusivamente na IA</li>
                    </ul>

                    <h2>4. Responsabilidades do Usuário</h2>
                    <p>Ao usar o GlucoAI, você concorda em:</p>
                    <ul>
                        <li>Fornecer informações precisas e atualizadas sobre sua condição de saúde</li>
                        <li>Usar o serviço apenas para fins educativos e de monitoramento pessoal</li>
                        <li>Não compartilhar sua conta com terceiros</li>
                        <li>Manter a confidencialidade de suas credenciais de acesso</li>
                    </ul>

                    <h2>5. Limitação de Responsabilidade</h2>
                    <p>
                        O GlucoAI e seus desenvolvedores NÃO se responsabilizam por:
                    </p>
                    <ul>
                        <li>Decisões médicas tomadas com base nas sugestões da IA</li>
                        <li>Erros ou imprecisões nas sugestões fornecidas (alucinações da IA)</li>
                        <li>Complicações de saúde decorrentes do uso inadequado do serviço</li>
                        <li>Interrupções ou falhas no serviço</li>
                    </ul>

                    <h2>6. Uso do WhatsApp</h2>
                    <p>
                        O GlucoAI utiliza o WhatsApp como canal de comunicação. Ao usar este serviço,
                        você reconhece que suas mensagens trafegam pela infraestrutura da Meta Inc.
                        (proprietária do WhatsApp), sujeita às políticas de privacidade da Meta.
                    </p>

                    <h2>7. Propriedade Intelectual</h2>
                    <p>
                        Todo o conteúdo, design, código e funcionalidades do GlucoAI são propriedade
                        exclusiva da empresa e estão protegidos por leis de direitos autorais.
                    </p>

                    <h2>8. Modificações dos Termos</h2>
                    <p>
                        Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento.
                        Usuários serão notificados sobre mudanças significativas e precisarão aceitar
                        a nova versão para continuar usando o serviço.
                    </p>

                    <h2>9. Rescisão</h2>
                    <p>
                        Podemos suspender ou encerrar seu acesso ao GlucoAI imediatamente, sem aviso
                        prévio, em caso de violação destes Termos de Uso.
                    </p>

                    <h2>10. Lei Aplicável</h2>
                    <p>
                        Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil.
                        Qualquer disputa será resolvida no foro da comarca de [CIDADE], Brasil.
                    </p>

                    <h2>11. Contato</h2>
                    <p>
                        Para dúvidas sobre estes Termos de Uso, entre em contato:
                        <br />
                        Email: <a href="mailto:legal@glucoai.com" className="text-teal-600">legal@glucoai.com</a>
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                        © 2026 GlucoAI. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
}
