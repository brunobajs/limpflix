import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('[Webhook] Recebido:', payload)

    // O Mercado Pago envia o ID do recurso em payload.data.id ou payload.id
    const paymentId = payload.data?.id || payload.id
    const type = payload.type || payload.action

    if (type !== 'payment.updated' && type !== 'payment.created' && payload.action !== 'payment.created') {
        // Ignorar outros tipos por enquanto
        return new Response(JSON.stringify({ message: 'Tipo de evento ignorado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    
    // 1. Consultar detalhes do pagamento na API do Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`
      }
    })

    if (!mpResponse.ok) {
      throw new Error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago`)
    }

    const payment = await mpResponse.json()
    console.log('[Webhook] Status do pagamento:', payment.status)

    if (payment.status === 'approved') {
        const metadata = payment.metadata
        const { provider_id, client_id, amount, service_name, service_quote_id } = metadata

        if (!provider_id || !client_id) {
           throw new Error('Metadados ausentes no pagamento')
        }

        // 2. Verificar se já processamos este pagamento (idempotência)
        const { data: existing } = await supabase
            .from('service_bookings')
            .select('id')
            .eq('external_payment_id', paymentId.toString())
            .single()

        if (existing) {
            return new Response(JSON.stringify({ message: 'Pagamento já processado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. Criar Agendamento e Atualizar Estados
        const { error: bookingError } = await supabase
            .from('service_bookings')
            .insert({
                provider_id,
                client_id,
                service_name: service_name || 'Serviço LimpFlix',
                total_amount: Number(amount),
                platform_fee: Number(amount) * 0.10,
                provider_net_amount: Number(amount) * 0.90,
                status: 'confirmed',
                payment_status: 'paid',
                quote_id: service_quote_id || null,
                external_payment_id: paymentId.toString()
            })

        if (bookingError) throw bookingError

        // 4. Marcar Provedor como Ocupado
        await supabase.from('service_providers').update({ is_busy: true }).eq('id', provider_id)

        // 5. Atualizar Orçamento se existir
        if (service_quote_id) {
            await supabase.from('service_quotes').update({ status: 'paid' }).eq('id', service_quote_id)
        }

        // 6. DISPARAR REPASSES (SPLIT 90/8/2)
        console.log('[Webhook] Iniciando repasses automáticos...')
        
        try {
            // Buscar dados do prestador e indicadores para o repasse
            const { data: provider } = await supabase
                .from('service_providers')
                .select('pix_key, referrer_id, trade_name, responsible_name')
                .eq('id', provider_id)
                .single()

            const { data: clientProfile } = await supabase
                .from('profiles')
                .select('referred_by_provider_id')
                .eq('id', client_id)
                .single()

            if (provider?.pix_key) {
                const totalAmount = Number(amount)
                const providerAmt = totalAmount * 0.90
                const totalReferralPool = totalAmount * 0.02
                
                // 6.1 Repasse Prestador (90%)
                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-payout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        pixKey: provider.pix_key,
                        amount: providerAmt,
                        description: `Repasse LimpFlix - ${provider.trade_name || provider.responsible_name}`,
                        idempotencyKey: `webhook-payout-${paymentId}-prov`
                    })
                })

                // 6.2 Repasse Indicadores (2%)
                const referrers = []
                if (clientProfile?.referred_by_provider_id) referrers.push(clientProfile.referred_by_provider_id)
                if (provider?.referrer_id && provider.referrer_id !== provider_id) {
                    if (!referrers.includes(provider.referrer_id)) referrers.push(provider.referrer_id)
                }

                if (referrers.length > 0) {
                    const individualReferralAmt = totalReferralPool / referrers.length
                    for (const refId of referrers) {
                        const { data: referrer } = await supabase
                            .from('service_providers')
                            .select('pix_key')
                            .eq('id', refId)
                            .single()

                        if (referrer?.pix_key && individualReferralAmt > 0) {
                            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-payout`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    pixKey: referrer.pix_key,
                                    amount: individualReferralAmt,
                                    description: `Comissão Indicação LimpFlix`,
                                    idempotencyKey: `webhook-payout-${paymentId}-ref-${refId}`
                                })
                            })
                        }
                    }
                }
            }
        } catch (payoutErr) {
            console.error('[Webhook Payout Error]:', payoutErr.message)
            // Não falhamos o webhook inteiro se o payout falhar, mas logamos o erro
        }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[Webhook Error]:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
