import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

export default function Terms() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-br from-navy to-navy-light py-10">
                <div className="max-w-3xl mx-auto px-4">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao início
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Termos de Uso</h1>
                            <p className="text-white/50 text-sm">Última atualização: fevereiro de 2026</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
                        <p>Ao acessar e utilizar a plataforma LimpFlix, você concorda com estes Termos de Uso. Caso não concorde, não utilize nossos serviços. A LimpFlix se reserva o direito de alterar estes termos a qualquer momento, com ou sem aviso prévio.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">2. Descrição do Serviço</h2>
                        <p>A LimpFlix é uma plataforma de marketplace que conecta clientes a profissionais de limpeza. Não somos prestadores de serviço diretamente — atuamos como intermediários tecnológicos, facilitando a contratação entre as partes.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">3. Cadastro e Conta</h2>
                        <p className="mb-2">Para utilizar determinadas funcionalidades, você precisará criar uma conta. Ao se cadastrar, você se compromete a:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>Fornecer informações verdadeiras, precisas e atualizadas;</li>
                            <li>Manter a confidencialidade de sua senha;</li>
                            <li>Notificar imediatamente qualquer uso não autorizado de sua conta;</li>
                            <li>Ser responsável por todas as atividades realizadas em sua conta.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">4. Responsabilidades dos Profissionais</h2>
                        <p className="mb-2">Profissionais cadastrados na plataforma devem:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>Possuir CNPJ ou documentação legal vigente;</li>
                            <li>Manter seus dados e informações sempre atualizados;</li>
                            <li>Prestar os serviços com qualidade, pontualidade e profissionalismo;</li>
                            <li>Respeitar os acordos firmados com os clientes;</li>
                            <li>Não utilizar a plataforma para atividades ilegais ou fraudulentas.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">5. Pagamentos e Comissões</h2>
                        <p>Os pagamentos são processados pela plataforma Mercado Pago. A LimpFlix retém uma comissão de <strong>6% sobre o valor total do serviço</strong> (5% de taxa de plataforma + 1% de indicação, quando aplicável). Os 94% restantes são creditados diretamente ao profissional responsável pelo serviço.</p>
                        <p className="mt-2">Saques podem ser solicitados via PIX a qualquer momento, respeitando o saldo mínimo de R$ 20,00.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">6. Programa de Indicações</h2>
                        <p>Profissionais cadastrados recebem um código de indicação exclusivo. Ao indicar outros profissionais ou clientes, o indicador passa a receber 1% de comissão permanente sobre os valores dos serviços realizados pelos indicados, enquanto essa relação se mantiver ativa na plataforma.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">7. Responsabilidade Civil do Prestador de Serviço</h2>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
                            <p className="text-red-800 font-semibold text-sm mb-1">⚠️ Cláusula de Responsabilidade Exclusiva do Prestador</p>
                            <p className="text-red-700 text-sm">Ao se cadastrar na plataforma LimpFlix, o prestador de serviço declara ciência e concordância integral com os termos desta cláusula.</p>
                        </div>
                        <p className="mb-3">O prestador de serviço é o <strong>único e exclusivo responsável</strong> por todos os atos, omissões e danos que venha a causar durante a prestação dos serviços contratados através da plataforma LimpFlix, incluindo, mas não se limitando a:</p>
                        <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
                            <li><strong>Roubo ou furto:</strong> qualquer subtração de bens, objetos, dinheiro, joias, eletrônicos ou qualquer outro item pertencente ao cliente ou a terceiros ocorrida durante ou em decorrência da prestação do serviço;</li>
                            <li><strong>Dano à propriedade:</strong> danos físicos causados ao imóvel do cliente, incluindo quebra de vidros, arranhões em pisos, manchas em paredes, danos a móveis, eletrodomésticos, instalações elétricas, hidráulicas ou qualquer outro bem que integre o imóvel;</li>
                            <li><strong>Dano ao objeto do serviço:</strong> danos causados diretamente ao objeto ou superfície que está sendo limpo ou tratado, como roupas, estofados, tapetes, veículos, equipamentos ou qualquer item entregue ao prestador para execução do serviço;</li>
                            <li><strong>Danos corporais:</strong> lesões físicas sofridas pelo cliente, seus familiares, funcionários ou qualquer terceiro, decorrentes de negligência, imperícia ou imprudência do prestador ou de seus colaboradores;</li>
                            <li><strong>Danos morais:</strong> situações que resultem em constrangimento, violação de privacidade ou dano à honra do cliente, decorrentes da conduta do prestador.</li>
                        </ul>
                        <p className="mb-3 font-semibold text-gray-800">Isenção Total de Responsabilidade da LimpFlix:</p>
                        <p className="mb-3">A <strong>LimpFlix</strong> é uma plataforma tecnológica de intermediação e <strong>não possui vínculo empregatício, societário ou de qualquer outra natureza</strong> com os prestadores de serviço cadastrados. A LimpFlix atua exclusivamente como canal de conexão entre clientes e prestadores, não sendo parte no contrato de prestação de serviços firmado entre eles.</p>
                        <p className="mb-3">Portanto, <strong>a LimpFlix está expressamente isenta de qualquer responsabilidade civil, criminal ou administrativa</strong> decorrente de:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                            <li>Roubos, furtos ou extravios cometidos por prestadores de serviço;</li>
                            <li>Danos materiais causados a imóveis, objetos ou veículos dos clientes;</li>
                            <li>Acidentes de trabalho ou danos pessoais ocorridos durante a prestação do serviço;</li>
                            <li>Qualquer ato ilícito praticado pelo prestador durante ou após a visita ao cliente;</li>
                            <li>Inadimplemento do serviço contratado por parte do prestador.</li>
                        </ul>
                        <p>O prestador reconhece que, ao aceitar estes Termos, assume integralmente os riscos e responsabilidades inerentes à sua atividade profissional, devendo manter seguro de responsabilidade civil, quando aplicável, e responder pessoalmente por quaisquer reclamações, indenizações, multas ou penalidades que venham a ser imputadas em razão de sua conduta.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">8. Limitação de Responsabilidade</h2>
                        <p>A LimpFlix não se responsabiliza por danos, prejuízos ou perdas decorrentes da má prestação de serviços por profissionais cadastrados, por disputas entre clientes e profissionais, ou por falhas nos serviços de terceiros (como gateways de pagamento ou infraestrutura de internet).</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">8. Cancelamento e Suspensão</h2>
                        <p>A LimpFlix se reserva o direito de suspender ou encerrar contas que violem estes Termos de Uso, sem aviso prévio e sem direito a reembolso de valores já processados.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">9. Legislação Aplicável</h2>
                        <p>Estes Termos de Uso são regidos pela legislação brasileira. Qualquer disputa será resolvida no foro da Comarca de Campinas, Estado de São Paulo, Brasil.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contato</h2>
                        <p>Para dúvidas sobre estes Termos, entre em contato pelo e-mail <a href="mailto:contato@limpflix.com" className="text-green hover:underline font-medium">contato@limpflix.com</a>.</p>
                    </section>
                </div>

                <div className="mt-6 text-center">
                    <Link to="/privacidade" className="text-green hover:underline text-sm font-medium">
                        Ver Política de Privacidade →
                    </Link>
                </div>
            </div>
        </div>
    )
}
