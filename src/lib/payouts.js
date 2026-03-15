/**
 * Utilitário para realizar Payouts (Saques) via Mercado Pago.
 * Nota: Esta API exige que a conta da LimpFlix tenha saldo e permissões de "Mass Payments".
 * 
 * Distribuição dos valores:
 * Com uma indicação:
 * - 94% para o prestador do serviço
 * - 5% para a plataforma
 * - 1% para o indicador
 * 
 * Com duas indicações (cliente e prestador):
 * - 94% para o prestador do serviço
 * - 5% para a plataforma
 * - 0.5% para quem indicou o cliente
 * - 0.5% para quem indicou o prestador
 * 
 * Sem indicação:
 * - 94% para o prestador do serviço
 * - 6% para a plataforma
 */

const MP_ACCESS_TOKEN = import.meta.env.VITE_MP_ACCESS_TOKEN;

// Constantes para os percentuais de distribuição
const PROVIDER_FEE = 0.94; // 94%
const BASE_PLATFORM_FEE = 0.06; // 6% (sem indicação)
const REFERRAL_PLATFORM_FEE = 0.05; // 5% (com indicação)
const SINGLE_REFERRAL_FEE = 0.01; // 1% para indicação única
const SPLIT_REFERRAL_FEE = 0.005; // 0.5% quando há duas indicações

/**
 * Calcula a distribuição dos valores do pagamento
 * @param {number} totalAmount - Valor total do pagamento
 * @param {boolean} hasReferral - Se existe indicador
 * @returns {Object} Valores calculados para cada parte
 */
export function calculateSplitAmounts(totalAmount, { hasClientReferral = false, hasProviderReferral = false } = {}) {
    const providerAmount = Math.floor(totalAmount * PROVIDER_FEE);
    
    // Define a taxa da plataforma baseado na existência de indicações
    const hasAnyReferral = hasClientReferral || hasProviderReferral;
    const platformFee = hasAnyReferral ? REFERRAL_PLATFORM_FEE : BASE_PLATFORM_FEE;
    const platformAmount = Math.floor(totalAmount * platformFee);

    // Calcula comissões de indicação
    const hasBothReferrals = hasClientReferral && hasProviderReferral;
    const referralFee = hasBothReferrals ? SPLIT_REFERRAL_FEE : SINGLE_REFERRAL_FEE;

    // Se tem ambas indicações, divide 0.5% para cada
    // Se tem apenas uma, paga 1% para quem indicou
    const clientReferralAmount = hasClientReferral ? Math.floor(totalAmount * referralFee) : 0;
    const providerReferralAmount = hasProviderReferral && hasBothReferrals ? Math.floor(totalAmount * referralFee) : 0;

    return {
        platformAmount,
        providerAmount,
        clientReferralAmount,
        providerReferralAmount,
        total: platformAmount + providerAmount + clientReferralAmount + providerReferralAmount
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
    clientReferrerPixKey = null,
    providerReferrerPixKey = null,
    description 
}) {
    const amounts = calculateSplitAmounts(totalAmount, {
        hasClientReferral: !!clientReferrerPixKey,
        hasProviderReferral: !!providerReferrerPixKey
    });

    const results = {
        provider: null,
        clientReferral: null,
        providerReferral: null,
        platformFee: amounts.platformAmount
    };

    try {
        // 1. Pagamento principal para o prestador (94%)
        results.provider = await sendPayoutPix({
            pixKey: providerPixKey,
            amount: amounts.providerAmount,
            description: `Pagamento ${description} (94%)`
        });

        // 2. Pagamento da comissão de indicação do cliente (0.5%, se houver)
        if (clientReferrerPixKey && amounts.clientReferralAmount > 0) {
            results.clientReferral = await sendPayoutPix({
                pixKey: clientReferrerPixKey,
                amount: amounts.clientReferralAmount,
                description: `Comissão Indicação Cliente - ${description} (0.5%)`,
                isReferralPayout: true
            });
        }

        // 3. Pagamento da comissão de indicação do prestador (0.5%, se houver)
        if (providerReferrerPixKey && amounts.providerReferralAmount > 0) {
            results.providerReferral = await sendPayoutPix({
                pixKey: providerReferrerPixKey,
                amount: amounts.providerReferralAmount,
                description: `Comissão Indicação Prestador - ${description} (0.5%)`,
                isReferralPayout: true
            });
        }

        return results;
    } catch (error) {
        console.error('Split payment failed:', error);
        throw new Error(`Falha no processamento do split: ${error.message}`);
    }
}
