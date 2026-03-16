// Supabase Edge Function — process-payout
// Processa pagamentos PIX (payouts) de forma segura no servidor.
// O Access Token NUNCA é exposto ao frontend.
//
// Deploy: npx supabase functions deploy process-payout
// Variável de ambiente: MERCADO_PAGO_ACCESS_TOKEN (setar no painel Supabase → Settings → Edge Functions)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pixKey, amount, description, idempotencyKey } = await req.json()

    if (!pixKey || !amount) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: pixKey, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount < 1) {
      return new Response(
        JSON.stringify({ error: 'O valor mínimo para payout é R$ 1,00' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')
    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado nas variáveis de ambiente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payoutData = {
      amount: Number(amount),
      description: description || 'Repasse LimpFlix',
      payment_method_id: 'pix',
      payer: {
        bank_transfer: {
          pix: {
            receiver_key: pixKey
          }
        }
      }
    }

    const response = await fetch('https://api.mercadopago.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey || `payout-${Date.now()}-${Math.random().toString(36).slice(2)}`
      },
      body: JSON.stringify(payoutData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[process-payout] MP API Error:', errorData)
      return new Response(
        JSON.stringify({ error: errorData.message || 'Erro ao processar transferência Pix', details: errorData }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[process-payout] Erro:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
