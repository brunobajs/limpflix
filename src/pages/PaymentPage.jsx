import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
    CreditCard, CheckCircle2, ShieldCheck, Loader2,
    AlertCircle, FileX, QrCode
} from 'lucide-react'
import { createPaymentPreference } from '../lib/mercadopago'

export default function PaymentPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [searchParams] = useSearchParams()
    const quoteId = searchParams.get('quote_id')
    const providerId = searchParams.get('provider_id')
    const chatId = searchParams.get('chat_id')

    const serviceQuoteId = searchParams.get('service_quote_id')

    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [amount, setAmount] = useState(parseFloat(searchParams.get('amount')) || 200.00)
    const [paymentMethod, setPaymentMethod] = useState('pix')
    const [provider, setProvider] = useState(null)
    const [service, setService] = useState(null)

    useEffect(() => {
        // Validação: Precisamos do provedor e de pelo menos um dos IDs de orçamento (solicitação ou proposta direta)
        if (!providerId || (!quoteId && !serviceQuoteId)) {
            alert('Dados insuficientes para iniciar o pagamento. Por favor, tente novamente a partir do chat.')
            navigate('/cliente/dashboard')
            return
        }
        loadDetails()
    }, [])

    async function loadDetails() {
        setLoading(true)
        try {
            // Fetch provider details
            const { data: prov } = await supabase.from('service_providers').select('*').eq('id', providerId).single()
            setProvider(prov)

            // Se houver um ID de orçamento, carregar o valor real do banco para segurança
            if (serviceQuoteId) {
                const { data: quote } = await supabase
                    .from('service_quotes')
                    .select('amount')
                    .eq('id', serviceQuoteId)
                    .single()

                if (quote) {
                    setAmount(parseFloat(quote.amount))
                }
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const [pixData, setPixData] = useState(null)
    const [copied, setCopied] = useState(false)

    async function handlePayment() {
        if (!provider || !user) {
            console.error('[Payment] Prestador ou usuário ausente:', { provider, user })
            alert('Dados do prestador ou login não encontrados. Tente recarregar a página.')
            return
        }
        setProcessing(true)

        try {
            console.log(`[Payment] Iniciando contratação via ${paymentMethod}...`, {
                clientEmail: user.email,
                amount,
                serviceQuoteId
            })

            // 1. Criar Preferência ou Pagamento no Mercado Pago (Centralizado)
            const preference = await createPaymentPreference({
                clientEmail: user.email,
                serviceName: 'Serviço LimpFlix - ' + (provider.trade_name || provider.responsible_name),
                amount: amount,
                metadata: {
                    provider_id: providerId,
                    client_id: user.id,
                    quote_id: quoteId || '',
                    service_quote_id: serviceQuoteId || '',
                    amount: amount,
                    service_name: 'Limpeza/Serviço especial'
                },
                paymentMethod: paymentMethod // Passa a intenção de PIX ou Cartão
            })

            console.log('[Payment] Comunicação com backend confirmada:', preference)

            // 2. Comportamento Condicional
            if (preference.type === 'pix') {
                // Desenhar PIX Nativo na tela
                setPixData({
                    qr_code: preference.qr_code,
                    qr_code_base64: preference.qr_code_base64,
                    id: preference.id
                })
            } else {
                // Redirecionar para o Mercado Pago (Checkout Pro - Cartão)
                if (preference.init_point) {
                    window.location.href = preference.init_point
                } else {
                    throw new Error('Não foi possível gerar o link de pagamento. Verifique o console.')
                }
            }

        } catch (err) {
            console.error('[Payment] Erro no processamento:', err)
            alert('Erro ao iniciar pagamento: ' + (err.message || 'Falha na comunicação com o servidor'))
        } finally {
            setProcessing(false)
        }
    }

    function handleCopyPix() {
        if (!pixData?.qr_code) return
        navigator.clipboard.writeText(pixData.qr_code)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-green" /></div>

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-green p-6 text-center text-white">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2" />
                    <h1 className="text-2xl font-bold">Checkout Seguro</h1>
                    <p className="opacity-90">LimpFlix Pagamentos</p>
                </div>

                <div className="p-8">
                    {pixData ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Escaneie o QR Code</h2>
                            <p className="text-gray-500 mb-6">Acesse seu banco e escolha pagar via PIX QR Code.</p>
                            
                            <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-green/20 mb-6 inline-block">
                                <img
                                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                                    alt="QR Code PIX"
                                    className="w-48 h-48 mx-auto"
                                />
                            </div>

                            <p className="text-gray-500 font-medium mb-3">Ou copie a chave (Pix Copia e Cola):</p>
                            
                            <button
                                onClick={handleCopyPix}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-mono text-xs break-all p-4 rounded-xl mb-4 text-left transition-colors relative"
                            >
                                <span className="line-clamp-2">{pixData.qr_code}</span>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm text-green border border-green/20">
                                    {copied ? 'Copiado!' : 'Copiar'}
                                </div>
                            </button>

                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 text-left">
                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>O pagamento será confirmado automaticamente nos próximos segundos. Assim que pagar, você pode voltar ao seu painel.</p>
                            </div>

                            <button
                                onClick={() => navigate('/cliente/dashboard')}
                                className="w-full bg-green hover:bg-green-dark text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
                            >
                                Voltar para o Painel
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Resumo</h2>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-800 font-medium">Prestador</span>
                                    <span className="text-gray-900 font-bold">{provider?.trade_name || provider?.responsible_name}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-800 font-medium">Serviço</span>
                                    <span className="text-gray-900">Limpeza/Serviço especial</span>
                                </div>
                                <div className="flex justify-between items-center py-4">
                                    <span className="text-gray-800 font-bold text-lg">Total</span>
                                    <span className="text-green font-bold text-2xl">R$ {amount.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-gray-400 text-center mt-2">
                                    *Pagamento processado via Mercado Pago.
                                </p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <h2 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Forma de Pagamento</h2>

                                <button
                                    onClick={() => setPaymentMethod('pix')}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentMethod === 'pix' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-green/50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <QrCode className="w-6 h-6 text-green" />
                                        <div className="text-left">
                                            <span className="font-bold text-gray-800 block leading-tight">PIX (Sem Taxas)</span>
                                            <span className="text-xs text-gray-500">Aprovação imediata na tela</span>
                                        </div>
                                    </div>
                                    {paymentMethod === 'pix' && <CheckCircle2 className="w-5 h-5 text-green" />}
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('credit_card')}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentMethod === 'credit_card' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-green/50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-6 h-6 text-gray-400" />
                                        <div className="text-left">
                                            <span className="font-semibold text-gray-700 block leading-tight">Cartão de Crédito</span>
                                            <span className="text-xs text-gray-500">Até 12x via Mercado Pago</span>
                                        </div>
                                    </div>
                                    {paymentMethod === 'credit_card' && <CheckCircle2 className="w-5 h-5 text-green" />}
                                </button>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full bg-green hover:bg-green-dark text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Gerando Pagamento...
                                    </>
                                ) : (
                                    <>
                                        {paymentMethod === 'pix' ? <QrCode className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                        {paymentMethod === 'pix' ? 'Gerar PIX Copia e Cola' : 'Pagar com Cartão'}
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-gray-400 mt-4">
                                Seu pagamento é protegido e só será liberado após sua confirmação de serviço realizado.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
