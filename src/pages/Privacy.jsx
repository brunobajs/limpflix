import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function Privacy() {
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
                            <Shield className="w-5 h-5 text-green" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Política de Privacidade</h1>
                            <p className="text-white/50 text-sm">Última atualização: fevereiro de 2026</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8 text-gray-700 text-sm leading-relaxed">

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">1. Introdução</h2>
                        <p>A LimpFlix respeita a sua privacidade e está comprometida com a proteção de seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Esta Política descreve como coletamos, usamos e protegemos suas informações.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">2. Dados que Coletamos</h2>
                        <p className="mb-2">Coletamos as seguintes categorias de dados:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, CNPJ, endereço;</li>
                            <li><strong>Dados de localização:</strong> coordenadas geográficas para busca por proximidade (apenas com sua permissão);</li>
                            <li><strong>Dados financeiros:</strong> chave PIX (para pagamento de prestadores), histórico de transações;</li>
                            <li><strong>Dados de uso:</strong> páginas visitadas, ações realizadas, avaliações e mensagens na plataforma;</li>
                            <li><strong>Dados de imagem:</strong> fotos de perfil, logotipo e portfólio enviados voluntariamente.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">3. Como Usamos seus Dados</h2>
                        <p className="mb-2">Utilizamos seus dados para:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>Criar e gerenciar sua conta na plataforma;</li>
                            <li>Conectar clientes a profissionais de limpeza;</li>
                            <li>Processar pagamentos e realizar saques via PIX;</li>
                            <li>Calcular e distribuir comissões do programa de indicações;</li>
                            <li>Exibir seu perfil público na busca de profissionais;</li>
                            <li>Enviar comunicações relevantes sobre seu uso da plataforma;</li>
                            <li>Melhorar continuamente nossos serviços.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">4. Compartilhamento de Dados</h2>
                        <p className="mb-2">Seus dados podem ser compartilhados com:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li><strong>Mercado Pago:</strong> para processamento de pagamentos;</li>
                            <li><strong>Supabase:</strong> nossa infraestrutura de banco de dados e autenticação, hospedada na AWS;</li>
                            <li><strong>Autoridades públicas:</strong> quando exigido por lei ou ordem judicial.</li>
                        </ul>
                        <p className="mt-2">Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins publicitários.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">5. Armazenamento e Segurança</h2>
                        <p>Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso. Implementamos controles de acesso por nível (Row Level Security) para garantir que você só acesse os dados que lhe pertencem.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">6. Seus Direitos (LGPD)</h2>
                        <p className="mb-2">Conforme a LGPD, você tem direito a:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                            <li>Confirmar a existência de tratamento de seus dados;</li>
                            <li>Acessar, corrigir ou atualizar seus dados;</li>
                            <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                            <li>Revogar o consentimento a qualquer momento;</li>
                            <li>Solicitar a portabilidade dos seus dados.</li>
                        </ul>
                        <p className="mt-2">Para exercer esses direitos, entre em contato: <a href="mailto:contato@limpflix.com" className="text-green hover:underline font-medium">contato@limpflix.com</a></p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">7. Cookies</h2>
                        <p>Utilizamos cookies essenciais para manter sua sessão autenticada. Não utilizamos cookies de rastreamento de terceiros para fins publicitários.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">8. Menores de Idade</h2>
                        <p>Nossa plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifique tal situação, entre em contato para remoção imediata dos dados.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">9. Alterações nesta Política</h2>
                        <p>Esta Política pode ser atualizada periodicamente. Usuários cadastrados serão notificados sobre mudanças significativas. O uso contínuo da plataforma após as alterações implica aceite da nova versão.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 mb-3">10. Contato do Encarregado (DPO)</h2>
                        <p>Para questões relacionadas à privacidade e proteção de dados: <a href="mailto:contato@limpflix.com" className="text-green hover:underline font-medium">contato@limpflix.com</a> — LimpFlix, Brasil.</p>
                    </section>
                </div>

                <div className="mt-6 text-center">
                    <Link to="/termos" className="text-green hover:underline text-sm font-medium">
                        Ver Termos de Uso →
                    </Link>
                </div>
            </div>
        </div>
    )
}
