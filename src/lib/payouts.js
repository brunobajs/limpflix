/**
 * Utilitário para realizar Payouts (Saques) via Mercado Pago.
 * Nota: Esta API exige que a conta da LimpFlix tenha saldo e permissões de "Mass Payments".
 */

const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN;

export async function sendPayoutPix({ pixKey, amount, description }) {
    const payoutData = {
        amount: amount,
        description: description || 'Repasse LimpFlix',
        payment_method_id: 'pix',
        payer: {
            bank_transfer: {
                pix: {
                    receiver_key: pixKey // A chave Pix do profissional
                }
            }
        }
    };

    try {
        const response = await fetch('https://api.mercadopago.com/v1/payouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `payout-${Date.now()}`
            },
            body: JSON.stringify(payoutData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao processar transferência Pix');
        }

        return await response.json();
    } catch (error) {
        console.error('Payout Error:', error);
        throw error;
    }
}
