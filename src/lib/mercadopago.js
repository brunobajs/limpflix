import { loadMercadoPago } from "@mercadopago/sdk-js"
import { supabase } from './supabase'

export const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY

if (!MP_PUBLIC_KEY) {
    console.warn('⚠️ Chave pública do Mercado Pago não configurada no .env')
}

export async function initMercadoPago() {
    try {
        await loadMercadoPago()
        const mp = new window.MercadoPago(MP_PUBLIC_KEY)
        return mp
    } catch (err) {
        console.error('Erro ao inicializar Mercado Pago:', err)
        throw err
    }
}

/**
 * Cria uma preferência de pagamento via Edge Function (server-side).
 * O Access Token do Mercado Pago é gerenciado de forma segura no servidor.
 */
export async function createPaymentPreference({ clientEmail, serviceName, amount, metadata }) {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Configuração do Supabase ausente no frontend.')
        }

        const functionUrl = `${supabaseUrl}/functions/v1/create-payment`
        
        console.log('[MP] Invocando edge function via FETCH...', functionUrl)

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ clientEmail, serviceName, amount, metadata })
        })

        if (!response.ok) {
            const errBody = await response.json().catch(() => ({}))
            console.error('[MP] Erro na resposta da Edge Function:', response.status, errBody)
            throw new Error(errBody.error || `Erro de servidor (${response.status})`)
        }

        const data = await response.json()

        if (!data?.init_point) {
            console.error('[MP] Resposta da função sem init_point:', data)
            throw new Error('Resposta inválida do gateway de pagamento')
        }

        return data
    } catch (err) {
        console.error('[MP] Erro fatal na chamada da função:', err)
        // Se o erro for de rede, o fetch lança uma exceção
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            throw new Error('Falha de conexão com o servidor de pagamento (CORS ou rede). Verifique o console.')
        }
        throw err
    }
}
