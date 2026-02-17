import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
    CreditCard, CheckCircle2, ShieldCheck, Loader2,
    AlertCircle, FileX, QrCode
} from 'lucide-react'
import { createPaymentPreference } from '../lib/mercadopago'

export default function PaymentPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const quoteId = searchParams.get('quote_id')
    const providerId = searchParams.get('provider_id')
    const chatId = searchParams.get('chat_id')

    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [amount, setAmount] = useState(parseFloat(searchParams.get('amount')) || 200.00)
    const [provider, setProvider] = useState(null)
    const [service, setService] = useState(null)

    useEffect(() => {
        if (!quoteId || !providerId) {
            alert('Dados inválidos para pagamento')
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

            // Price is dynamic from URL
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function handlePayment() {
        if (!provider) return
        setProcessing(true)

        try {
            const user = (await supabase.auth.getUser()).data.user

            // 1. Criar Preferência no Mercado Pago (Centralizado)
            const preference = await createPaymentPreference({
                clientEmail: user.email,
                serviceName: 'Serviço LimpFlix - ' + (provider.trade_name || provider.responsible_name),
                amount: amount,
                metadata: {
                    provider_id: providerId,
                    client_id: user.id,
                    quote_id: quoteId || '',
                    amount: amount,
                    service_name: 'Limpeza/Serviço especial'
                }
            })

            // 2. Redirecionar para o Mercado Pago (Checkout Pro)
            if (preference.init_point) {
                window.location.href = preference.init_point
            } else {
                throw new Error('Não foi possível gerar o link de pagamento')
            }

        } catch (err) {
            console.error('Payment Error', err)
            alert('Erro ao iniciar pagamento: ' + err.message)
        } finally {
            setProcessing(false)
        }
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
                                <span className="font-bold text-gray-300 text-xl">PIX</span>
                                <span className="font-semibold text-gray-700">Pix (Instantâneo)</span>
                            </div>
                            {paymentMethod === 'pix' && <CheckCircle2 className="w-5 h-5 text-green" />}
                        </button>

                        <button
                            onClick={() => setPaymentMethod('credit_card')}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentMethod === 'credit_card' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-green/50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-5 h-5 text-gray-400" />
                                <span className="font-semibold text-gray-700">Cartão de Crédito</span>
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
                                Processando...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-5 h-5" />
                                Pagar Agora
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        Seu pagamento é protegido e só será liberado após sua confirmação de serviço realizado.
                    </p>
                </div>
            </div>
        </div>
    )
}
