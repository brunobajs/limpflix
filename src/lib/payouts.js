/**
 * Utilitário para realizar Payouts (Saques) via Mercado Pago.
 * Nota: Esta API exige que a conta da LimpFlix tenha saldo e permissões de "Mass Payments".
 * 
 * Distribuição dos valores:
 * - 94% para o prestador do serviço
 * - 5% para a plataforma
 * - 1% para quem indicou (se houver)
 */

const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN;

// Constantes para os percentuais de distribuição
const PLATFORM_FEE = 0.05; // 5%
const REFERRAL_FEE = 0.01; // 1%
const PROVIDER_FEE = 0.94; // 94%

/**
 * Calcula a distribuição dos valores do pagamento
 * @param {number} totalAmount - Valor total do pagamento
 * @param {boolean} hasReferral - Se existe indicador
 * @returns {Object} Valores calculados para cada parte
 */
export function calculateSplitAmounts(totalAmount) {
    const platformAmount = Math.floor(totalAmount * PLATFORM_FEE);
    const referralAmount = Math.floor(totalAmount * REFERRAL_FEE);
    const providerAmount = Math.floor(totalAmount * PROVIDER_FEE);

    return {
        platformAmount,
        referralAmount,
        providerAmount,
        total: platformAmount + referralAmount + providerAmount
    };
}

/**
 * Realiza o pagamento PIX para o prestador
 */
export async function sendPayoutPix({ pixKey, amount, description, isReferralPayout = false }) {
    const payoutData = {
        amount: amount,
        description: description || (isReferralPayout ? 'Comissão de Indicação LimpFlix' : 'Repasse LimpFlix'),
        payment_method_id: 'pix',
        payer: {
            bank_transfer: {
                pix: {
                    receiver_key: pixKey
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
                'X-Idempotency-Key': `payout-${Date.now()}-${isReferralPayout ? 'ref' : 'prov'}`
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

/**
 * Processa o split completo do pagamento
 */
export async function processSplitPayment({ 
    totalAmount, 
    providerPixKey, 
    referrerPixKey = null, 
    description 
}) {
    const amounts = calculateSplitAmounts(totalAmount);
    const results = {
        provider: null,
        referrer: null,
        platformFee: amounts.platformAmount
    };

    try {
        // 1. Pagamento principal para o prestador (94%)
        results.provider = await sendPayoutPix({
            pixKey: providerPixKey,
            amount: amounts.providerAmount,
            description: `Pagamento ${description} (94%)`
        });

        // 2. Pagamento da comissão de indicação (1%, se houver)
        if (referrerPixKey) {
            results.referrer = await sendPayoutPix({
                pixKey: referrerPixKey,
                amount: amounts.referralAmount,
                description: `Comissão de Indicação - ${description} (1%)`,
                isReferralPayout: true
            });
        }

        return results;
    } catch (error) {
        console.error('Split payment failed:', error);
        throw new Error(`Falha no processamento do split: ${error.message}`);
    }
}
