import { loadMercadoPago } from "@mercadopago/sdk-js"
import { supabase } from './supabase'

export const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY
export const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN

if (!MP_PUBLIC_KEY) {
    throw new Error('⚠️ Chave pública do Mercado Pago não configurada no .env')
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

export async function createPaymentPreference({ clientEmail, serviceName, amount, metadata }) {
    try {
        // 1. Tenta via Edge Function (produção)
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: { clientEmail, serviceName, amount, metadata }
        })

        if (!error && data?.init_point) {
            return data
        }

        // 2. Fallback: chamada direta (desenvolvimento)
        if (!MP_ACCESS_TOKEN) {
            throw new Error('Configure VITE_MP_ACCESS_TOKEN no .env ou deploy a Edge Function create-payment')
        }

        const queryParams = metadata ? new URLSearchParams(metadata).toString() : ''
        const origin = window.location.origin

        const preference = {
            items: [{ 
                title: serviceName, 
                quantity: 1, 
                unit_price: Number(amount), 
                currency_id: 'BRL' 
            }],
            payer: { email: clientEmail },
            external_reference: metadata?.quote_id || '',
            back_urls: {
                success: `${origin}/pagamento/sucesso?${queryParams}`,
                failure: `${origin}/pagamento/erro`,
                pending: `${origin}/pagamento/pendente`,
            },
            auto_return: 'approved',
            payment_methods: {
                excluded_payment_types: [{ id: 'ticket' }],
                installments: 12,
            },
            statement_descriptor: 'LimpFlix Serviços',
        }

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preference),
        })

        if (!response.ok) {
            const errData = await response.json()
            throw new Error(errData.message || 'Erro ao criar preferência de pagamento')
        }

        return response.json()
    } catch (err) {
        console.error('Erro ao criar preferência:', err)
        throw err
    }
}
