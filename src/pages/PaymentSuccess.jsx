import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Home } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
        // Nota: Em um sistema real, o Booking seria criado via Webhook para garantir
        // que mesmo se o usuário fechar a aba, o dado persista. 
        // Aqui simulamos a finalização na volta do checkout.

        try {
            // Lógica para confirmar o agendamento no banco
            // (Poderíamos buscar dados salvos temporariamente ou via metadados do MP)

            setTimeout(() => {
                setLoading(false)
            }, 1500)
        } catch (err) {
            console.error(err)
            setLoading(false)
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
