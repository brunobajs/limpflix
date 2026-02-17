/**
 * Utilitário para integração com Mercado Pago via REST API.
 * Nota: Para segurança em produção, estas chamadas devem ser movidas para uma Edge Function (Backend).
 */

const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN; // Usar com cautela no front-end
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;

export async function createPaymentPreference({ clientEmail, serviceName, amount, metadata }) {
    // Serializar metadata para passar na URL de sucesso
    const queryParams = new URLSearchParams(metadata).toString();

    const preference = {
        items: [
            {
                title: serviceName,
                quantity: 1,
                unit_price: amount,
                currency_id: 'BRL'
            }
        ],
        payer: {
            email: clientEmail
        },
        external_reference: metadata.quote_id || '',
        // Removido marketplace_fee pois o repasse é feito via API de Pix (Caminho 2)
        // Isso garante que a plataforma receba 100% para realizar o split manual imediato.

        back_urls: {
            success: `${window.location.origin}/pagamento/sucesso?${queryParams}`,
            failure: `${window.location.origin}/pagamento/erro`,
            pending: `${window.location.origin}/pagamento/pendente`
        },
        auto_return: 'approved',
        payment_methods: {
            excluded_payment_types: [
                { id: 'ticket' } // Remove boleto se preferir apenas Pix/Cartão
            ],
            installments: 12
        },
        statement_descriptor: 'LimpFlix Serviços'
    };

    try {
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preference)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar preferência de pagamento');
        }

        return await response.json();
    } catch (error) {
        console.error('Mercado Pago Error:', error);
        throw error;
    }
}

export const MP_CONFIG = {
    publicKey: MP_PUBLIC_KEY
};
