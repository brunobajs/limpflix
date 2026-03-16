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
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: { clientEmail, serviceName, amount, metadata }
        })

        if (error) {
            console.error('Edge Function error:', error)
            throw new Error(error.message || 'Erro ao criar preferência de pagamento')
        }

        if (!data?.init_point) {
            throw new Error('Resposta inválida do servidor de pagamento')
        }

        return data
    } catch (err) {
        console.error('Erro ao criar preferência:', err)
        throw err
    }
}
