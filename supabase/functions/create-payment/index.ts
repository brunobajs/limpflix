// Supabase Edge Function — create-payment
// Cria uma preferência de pagamento no Mercado Pago de forma segura (server-side).
// O Access Token NUNCA é exposto ao frontend.
//
// Deploy: npx supabase functions deploy create-payment
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
    const { clientEmail, serviceName, amount, metadata } = await req.json()

    if (!clientEmail || !serviceName || !amount) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: clientEmail, serviceName, amount' }),
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

    // Monta a URL de retorno com os metadados serializado
    const origin = req.headers.get('origin') || 'https://limpflix.com'
    const queryParams = metadata ? new URLSearchParams(metadata).toString() : ''

    const preference = {
      items: [
        {
          title: serviceName,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: clientEmail,
      },
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
      throw new Error(errData.message || 'Erro ao criar preferência de pagamento no Mercado Pago')
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-payment] Erro:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
