import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Home } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { sendPayoutPix } from '../lib/payouts'

export default function PaymentSuccess() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Mercado Pago redireciona com vários parâmetros (?collection_id=...&status=approved...)
        const status = searchParams.get('status')

        if (status === 'approved') {
            handleFinalizeBooking()
        } else {
            setLoading(false)
        }
    }, [searchParams])

    async function handleFinalizeBooking() {
        try {
            const providerId = searchParams.get('provider_id')
            const clientId = searchParams.get('client_id')
            const amount = parseFloat(searchParams.get('amount'))
            const serviceName = searchParams.get('service_name')

            if (!providerId || !clientId) {
                console.warn('Missing data for booking confirmation')
                setLoading(false)
                return
            }

            // 1. Verificar se o agendamento já existe (evitar duplicidade por refresh)
            const { data: existing } = await supabase
                .from('service_bookings')
                .select('id')
                .eq('provider_id', providerId)
                .eq('client_id', clientId)
                .eq('status', 'confirmed')
                .order('created_at', { ascending: false })
                .limit(1)

            // Se não existir um agendamento recente "confirmado", criamos um
            if (!existing || existing.length === 0) {
                const { error: insertError } = await supabase
                    .from('service_bookings')
                    .insert({
                        provider_id: providerId,
                        client_id: clientId,
                        service_name: serviceName || 'Limpeza/Serviço especial',
                        total_amount: amount,
                        status: 'confirmed',
                        payment_status: 'paid'
                    })

                if (insertError) throw insertError

                // 2. Marcar profissional como ocupado
                await supabase
                    .from('service_providers')
                    .update({ is_busy: true })
                    .eq('id', providerId)

                // 3. REPASSE AUTOMÁTICO (SPLIT 94/5/1)
                await handleAutomaticRepasse(providerId, clientId, amount)
            }

            setLoading(false)
        } catch (err) {
            console.error('Error finalizing booking:', err)
            setLoading(false)
        }
    }

    async function handleAutomaticRepasse(providerId, clientId, totalAmount) {
        try {
            // 1. Buscar dados do Prestador (Pix e Referência)
            const { data: provider } = await supabase
                .from('service_providers')
                .select('pix_key, referrer_id, trade_name, responsible_name')
                .eq('id', providerId)
                .single()

            if (!provider || !provider.pix_key) {
                console.error('Provider Pix Key not found for automatic payout')
                return
            }

            // 2. Buscar indicador (Prioridade: Cliente -> Prestador)
            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('referred_by_provider_id')
                .eq('id', clientId)
                .single()

            let referrerId = clientProfile?.referred_by_provider_id || provider?.referrer_id
            let referralAmt = totalAmount * 0.01
            let providerAmt = totalAmount * 0.94

            // 3. Executar Repasse ao Prestador (94%)
            try {
                await sendPayoutPix({
                    pixKey: provider.pix_key,
                    amount: providerAmt,
                    description: `Repasse LimpFlix - ${provider.trade_name || provider.responsible_name}`
                })
                console.log('Automated payout sent to provider:', providerAmt)
            } catch (err) {
                console.error('Failed to send automated payout to provider:', err)
            }

            // 4. Executar Repasse ao Indicador (1%) se existir
            if (referrerId && referrerId !== providerId) {
                const { data: referrer } = await supabase
                    .from('service_providers')
                    .select('pix_key')
                    .eq('id', referrerId)
                    .single()

                if (referrer?.pix_key) {
                    try {
                        await sendPayoutPix({
                            pixKey: referrer.pix_key,
                            amount: referralAmt,
                            description: `Comissão Indicação LimpFlix`
                        })
                        console.log('Automated payout sent to referrer:', referralAmt)
                    } catch (err) {
                        console.error('Failed to send automated payout to referrer:', err)
                    }
                }
            }
        } catch (err) {
            console.error('Error in handleAutomaticRepasse:', err)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-fade-in">
                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-green animate-spin" />
                        <h1 className="text-xl font-bold text-gray-700">Processando sua confirmação...</h1>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green" />
                        </div>
                        <h1 className="text-3xl font-bold text-navy mb-2">Pagamento Aprovado!</h1>
                        <p className="text-gray-600 mb-8">
                            Obrigado! Seu pagamento foi processado com sucesso e o profissional já foi notificado.
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/cliente/dashboard')}
                                className="w-full bg-green hover:bg-green-dark text-white py-4 rounded-xl font-bold shadow-lg transition-all"
                            >
                                Ir para meu Dashboard
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full text-gray-500 hover:text-navy font-medium py-2 flex items-center justify-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Voltar para o Início
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
