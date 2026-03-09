import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    const { type, target_user_id, target_phone, content, metadata } = await req.json()

    console.log(`Recebido evento: ${type} para usuário ${target_user_id}`)

    let phone = target_phone

    // Se não tiver o telefone, tenta buscar no perfil do prestador
    if (!phone && target_user_id) {
      const { data: provider } = await supabase
        .from('service_providers')
        .select('phone')
        .eq('user_id', target_user_id)
        .single()
      
      phone = provider?.phone
    }

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Telefone não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Formatar mensagem amigável
    const dashboardUrl = `https://limpflix.com/prestador/dashboard`
    let whatsappMessage = ''
    if (type === 'new_message') {
      whatsappMessage = `*LimpFlix:* Você recebeu uma nova mensagem!\n\n"${content}"\n\nAcesse para responder: ${dashboardUrl}`
    } else if (type === 'new_quote') {
      whatsappMessage = `*LimpFlix:* Um novo orçamento foi enviado para você!\n\n${content}\n\nAcesse para conferir: ${dashboardUrl}`
    } else {
      whatsappMessage = `*LimpFlix:* ${content}\n\nLink: ${dashboardUrl}`
    }

    // DISPARO VIA WHATSAPP (Exemplo com Webhook Generic ou API Direta)
    // Aqui em produção você colocaria a URL do seu gateway (Twilio, Z-API, Evolution API, etc.)
    const WHATSAPP_GATEWAY_URL = Deno.env.get('WHATSAPP_GATEWAY_URL')
    const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY')

    if (WHATSAPP_GATEWAY_URL) {
      const response = await fetch(WHATSAPP_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_API_KEY}`
        },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''), // Limpa caracteres não numéricos
          message: whatsappMessage
        })
      })

      const result = await response.json()
      console.log('Resultado do disparo WhatsApp:', result)
    } else {
      console.log('--- MOCK DISPARO WHATSAPP ---')
      console.log(`PARA: ${phone}`)
      console.log(`MSG: ${whatsappMessage}`)
      console.log('-----------------------------')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Erro na Edge Function:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
