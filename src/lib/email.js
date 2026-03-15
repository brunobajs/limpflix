// Serviço de email seguro - usa Edge Function ao invés de chave exposta
import { supabase } from './supabase'

export async function sendEmail({ to, subject, html, from }) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, from }
    })

    if (error) {
      console.error('Error sending email:', error)
      throw error
    }

    return data
  } catch (err) {
    console.error('Email service error:', err)
    throw err
  }
}

// Templates de email pré-definidos
export const emailTemplates = {
  welcome: (name) => ({
    subject: 'Bem-vindo ao LimpFlix!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Bem-vindo ao LimpFlix, ${name}!</h1>
        <p>Sua conta foi criada com sucesso.</p>
        <p>Agora você pode oferecer seus serviços de limpeza para milhares de clientes.</p>
        <a href="https://limpflix.com/dashboard" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
          Acessar Dashboard
        </a>
      </div>
    `
  }),

  newBooking: (providerName, clientName, service, date) => ({
    subject: 'Nova solicitação de serviço!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #10B981;">Nova solicitação!</h1>
        <p>Olá ${providerName},</p>
        <p><strong>${clientName}</strong> solicitou: <strong>${service}</strong></p>
        <p>Data: ${date}</p>
        <a href="https://limpflix.com/dashboard" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
          Ver detalhes
        </a>
      </div>
    `
  })
}