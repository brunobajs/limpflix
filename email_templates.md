# LimpFlix Email Templates (Supabase)

Copie e cole os conteúdos abaixo no seu painel da Supabase em **Authentication > Email Templates**.

---

## 1. Confirm Signup (Confirmação de Cadastro)
**Assunto:** Bem-vindo à LimpFlix! Confirme seu e-mail 🚀
**Corpo da Mensagem:**
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
  <h2 style="color: #001F3F;">Olá!</h2>
  <p>Obrigado por se cadastrar na <strong>LimpFlix</strong>, a maior plataforma de serviços de limpeza profissional.</p>
  <p>Para ativar sua conta e começar agora mesmo, clique no botão abaixo:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #00C853; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Confirmar minha conta
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">Se o botão não funcionar, copie este link: <br>{{ .ConfirmationURL }}</p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #999;">Equipe LimpFlix - O futuro da limpeza.</p>
</div>
```

---

## 2. Reset Password (Recuperação de Senha)
**Assunto:** Recuperação de senha - LimpFlix 🔒
**Corpo da Mensagem:**
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
  <h2 style="color: #001F3F;">Esqueceu sua senha?</h2>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta na <strong>LimpFlix</strong>.</p>
  <p>Clique no botão abaixo para criar uma nova senha:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #001F3F; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Redefinir minha senha
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #999;">Equipe LimpFlix</p>
</div>
```

---

## 3. Magic Link (Login sem senha)
**Assunto:** Seu link de acesso à LimpFlix ✨
**Corpo da Mensagem:**
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
  <h2 style="color: #001F3F;">Entrar na plataforma</h2>
  <p>Clique no botão abaixo para entrar instantaneamente na sua conta <strong>LimpFlix</strong>:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #00C853; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Entrar agora
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">Este link é válido por tempo limitado.</p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #999;">Equipe LimpFlix</p>
</div>
```

---

## 4. Change Email Address (Troca de E-mail)
**Assunto:** Confirme sua nova conta de e-mail - LimpFlix 📧
**Corpo da Mensagem:**
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
  <h2 style="color: #001F3F;">Alteração de E-mail</h2>
  <p>Você solicitou a troca do seu endereço de e-mail na <strong>LimpFlix</strong>.</p>
  <p>Por favor, confirme o novo endereço clicando abaixo:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{ .ConfirmationURL }}" style="background-color: #00C853; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Confirmar novo e-mail
    </a>
  </div>

  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #999;">Equipe LimpFlix</p>
</div>
---
---

## 5. New Quote Request (Novo Pedido de Orçamento)
**Assunto:** 🔔 Novo pedido de orçamento disponível na LimpFlix!
**Corpo da Mensagem:**
```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 40px;">🔔</span>
  </div>
  <h2 style="color: #001F3F; text-align: center;">Olá! Você tem um novo pedido!</h2>
  <p>Um cliente acaba de solicitar um orçamento para <strong>{{ .service_name }}</strong> na sua região.</p>
  
  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #666; font-size: 14px;"><strong>Local:</strong> {{ .city }}, {{ .state }}</p>
    <p style="margin: 5px 0 0; color: #666; font-size: 14px;"><strong>Distância:</strong> {{ .distance }} km</p>
  </div>

  <p>Acesse seu painel agora para ver os detalhes e enviar sua proposta:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://limpflix.com/dashboard?tab=messages" style="background-color: #00C853; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Ver pedido e Chat
    </a>
  </div>

  <p style="color: #666; font-size: 14px; text-align: center;">Seja rápido! Os primeiros profissionais costumam fechar mais serviços.</p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #999; text-align: center;">Equipe LimpFlix - Conectando você aos melhores serviços.</p>
</div>
```
