// OS-15: Aviso Médico (Disclaimer)
// Página Legal Estática - Proteção contra Processos
// Data: 2026-01-03

import React from 'react';
import { AlertTriangle, Heart } from 'lucide-react';

export default function AvisoMedico() {
    return (
        <div className="prose prose-teal max-w-none">
            {/* Alert Principal */}
            <div className="bg-red-50 border-4 border-red-500 rounded-xl p-6 mb-8">
                <div className="flex items-start gap-4">
                    <AlertTriangle className="text-red-600 flex-shrink-0" size={48} />
                    <div>
                        <h2 className="text-2xl font-bold text-red-900 mb-2">
                            A Glicie NÃO É UM MÉDICO
                        </h2>
                        <p className="text-red-800 text-lg">
                            Este serviço é uma <strong>ferramenta educativa</strong> baseada em Inteligência
                            Artificial e <strong>NÃO substitui orientação médica profissional</strong>.
                        </p>
                    </div>
                </div>
            </div>

            <h2>1. Natureza do Serviço</h2>
            <p>
                A Glicie utiliza Inteligência Artificial (IA) para fornecer <strong>sugestões
                    educativas</strong> sobre:
            </p>
            <ul>
                <li>Cálculo de doses de insulina</li>
                <li>Contagem de carboidratos</li>
                <li>Análise de tendências glicêmicas</li>
                <li>Orientações gerais sobre diabetes</li>
            </ul>
            <p>
                <strong>IMPORTANTE:</strong> Essas sugestões são baseadas em algoritmos e podem
                conter erros, imprecisões ou "alucinações" da IA.
            </p>

            <h2>2. Limitações da Inteligência Artificial</h2>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 my-4">
                <p className="text-amber-900">
                    <strong>Atenção:</strong> Sistemas de IA podem cometer erros, incluindo:
                </p>
                <ul className="text-amber-800">
                    <li>Cálculos incorretos de doses de insulina</li>
                    <li>Interpretação errada de dados fornecidos</li>
                    <li>Sugestões inadequadas para sua condição específica</li>
                    <li>"Alucinações" (informações inventadas pela IA)</li>
                </ul>
            </div>

            <h2>3. Suas Responsabilidades</h2>
            <p>Ao usar a Glicie, você concorda em:</p>
            <ol>
                <li>
                    <strong>Conferir Manualmente:</strong> Sempre verificar os cálculos sugeridos
                    pela IA antes de aplicar qualquer dose de insulina
                </li>
                <li>
                    <strong>Consultar seu Médico:</strong> Discutir com seu endocrinologista
                    qualquer mudança em seu tratamento
                </li>
                <li>
                    <strong>Seguir seu Plano de Tratamento:</strong> Priorizar as orientações
                    do seu médico sobre as sugestões da IA
                </li>
                <li>
                    <strong>Monitorar Reações:</strong> Observar como seu corpo responde e
                    ajustar conforme necessário
                </li>
                <li>
                    <strong>Emergências:</strong> Em caso de hipoglicemia severa ou hiperglicemia,
                    procurar atendimento médico imediatamente
                </li>
            </ol>

            <h2>4. O que a Glicie NÃO Faz</h2>
            <ul>
                <li>❌ NÃO diagnostica diabetes ou outras condições médicas</li>
                <li>❌ NÃO prescreve medicamentos ou tratamentos</li>
                <li>❌ NÃO substitui consultas médicas regulares</li>
                <li>❌ NÃO fornece atendimento de emergência</li>
                <li>❌ NÃO é um dispositivo médico certificado</li>
            </ul>

            <h2>5. Quando Procurar um Médico</h2>
            <p>Procure atendimento médico imediatamente se você:</p>
            <ul>
                <li>Apresentar sintomas de hipoglicemia severa (confusão, tremores, desmaio)</li>
                <li>Tiver glicemia consistentemente acima de 300 mg/dL</li>
                <li>Apresentar cetoacidose diabética (hálito cetônico, náusea, vômito)</li>
                <li>Tiver dúvidas sobre seu tratamento ou condição</li>
                <li>Experimentar efeitos colaterais de medicamentos</li>
            </ul>

            <h2>6. Limitação de Responsabilidade</h2>
            <p className="bg-gray-100 border-l-4 border-gray-500 p-4">
                A Glicie e seus desenvolvedores <strong>NÃO se responsabilizam</strong> por:
            </p>
            <ul>
                <li>Decisões médicas tomadas com base nas sugestões da IA</li>
                <li>Erros de cálculo ou sugestões inadequadas</li>
                <li>Complicações de saúde decorrentes do uso do serviço</li>
                <li>Hipoglicemia, hiperglicemia ou outras emergências médicas</li>
                <li>Danos diretos ou indiretos causados pelo uso do serviço</li>
            </ul>

            <h2>7. Uso Educativo e Informativo</h2>
            <p>
                A Glicie deve ser usada exclusivamente como:
            </p>
            <ul>
                <li>✅ Ferramenta educativa para aprender sobre diabetes</li>
                <li>✅ Auxílio no monitoramento glicêmico pessoal</li>
                <li>✅ Complemento ao seu plano de tratamento médico</li>
                <li>✅ Registro de histórico de glicemia e insulina</li>
            </ul>

            <h2>8. Certificações e Regulamentações</h2>
            <p>
                A Glicie <strong>NÃO é certificada</strong> como dispositivo médico por:
            </p>
            <ul>
                <li>ANVISA (Agência Nacional de Vigilância Sanitária)</li>
                <li>FDA (Food and Drug Administration)</li>
                <li>CE (Conformité Européenne)</li>
            </ul>
            <p>
                Portanto, não deve ser usado como substituto de dispositivos médicos certificados.
            </p>

            <h2>9. Consentimento Informado</h2>
            <p>
                Ao usar a Glicie, você declara que:
            </p>
            <ul>
                <li>Leu e compreendeu este Aviso Médico</li>
                <li>Entende as limitações da Inteligência Artificial</li>
                <li>Assume total responsabilidade por suas decisões de saúde</li>
                <li>Não responsabilizará a Glicie por erros ou complicações</li>
            </ul>

            <h2>10. Recursos de Emergência</h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
                <div className="flex items-start gap-3">
                    <Heart className="text-blue-600 flex-shrink-0" size={24} />
                    <div>
                        <p className="font-bold text-blue-900 mb-2">Em caso de emergência:</p>
                        <ul className="text-blue-800">
                            <li><strong>SAMU:</strong> 192</li>
                            <li><strong>Bombeiros:</strong> 193</li>
                            <li><strong>Pronto-Socorro:</strong> Procure o mais próximo</li>
                        </ul>
                    </div>
                </div>
            </div>

            <h2>11. Contato</h2>
            <p>
                Para dúvidas sobre este Aviso Médico:
                <br />
                Email: <a href="mailto:legal@glicie.com.br" className="text-teal-600">legal@glicie.com.br</a>
            </p>

            <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                    © 2026 Glicie. Todos os direitos reservados.
                    <br />
                    Este aviso médico é parte integrante dos Termos de Uso.
                </p>
            </div>
        </div>
    );
}
