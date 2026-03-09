/**
 * Utilitário para integração com Mercado Pago.
 *
 * ✅ SEGURO: O Access Token fica na Edge Function do Supabase (server-side).
 * O frontend usa apenas a Public Key (segura de expor) para inicializar o SDK.
 *
 * Deploy da Edge Function:
 *   npx supabase functions deploy create-payment
 * Variável de ambiente (Supabase → Settings → Edge Functions):
 *   MERCADO_PAGO_ACCESS_TOKEN = <sua chave privada>
 */

import { supabase } from './supabase'

export const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY

export const MP_CONFIG = {
    publicKey: MP_PUBLIC_KEY
}

/**
 * Cria uma preferência de pagamento via Edge Function (seguro, server-side).
 * Inclui fallback para chamada direta em caso de a Edge Function não estar disponível.
 * @param {object} params - clientEmail, serviceName, amount, metadata
 * @returns {Promise<{init_point: string}>}
 */
export async function createPaymentPreference({ clientEmail, serviceName, amount, metadata }) {
    // 1. Tenta via Edge Function (produção segura — chave fica no servidor)
    try {
        const { data, error } = await supabase.functions.invoke('create-payment', {
            body: { clientEmail, serviceName, amount, metadata }
        })

        if (error) throw error
        if (!data?.init_point) throw new Error('Edge Function não retornou init_point')

        return data
    } catch (edgeFnErr) {
        console.warn('[MP] Edge Function indisponível, usando fallback direto:', edgeFnErr.message)
    }

    // 2. Fallback: chama a API do MP diretamente (só funciona com VITE_MP_ACCESS_TOKEN)
    const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN
    if (!MP_ACCESS_TOKEN) {
        throw new Error(
            'Pagamento indisponível. Configure a Edge Function "create-payment" no Supabase ' +
            'ou adicione VITE_MP_ACCESS_TOKEN no .env (apenas para desenvolvimento).'
        )
    }

    const queryParams = metadata ? new URLSearchParams(metadata).toString() : ''
    const origin = window.location.origin

    const preference = {
        items: [{ title: serviceName, quantity: 1, unit_price: Number(amount), currency_id: 'BRL' }],
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
}
