-- ===============================================
-- LIMPFLIX - MIGRAÇÃO TOTAL (WhatsApp + Segurança/KYC)
-- Data: 2026-03-09
-- Rodar no SQL Editor do Supabase
-- ===============================================

-- PARTE 1: WHATSAPP (Notificações)
-- --------------------------------------------------

-- 1. Habilitar extensões necessárias (net para chamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Função de Notificação
CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_event()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  target_user_id UUID;
  target_phone TEXT;
  message_content TEXT;
  notification_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'chat_messages' THEN
    SELECT 
      CASE WHEN NEW.sender_id = c.client_id THEN (SELECT user_id FROM service_providers WHERE id = c.provider_id) ELSE c.client_id END,
      CASE WHEN NEW.sender_id = c.client_id THEN (SELECT phone FROM service_providers WHERE id = c.provider_id) ELSE NULL END
    INTO target_user_id, target_phone
    FROM chat_conversations c
    WHERE c.id = NEW.conversation_id;

    IF target_phone IS NULL THEN
      SELECT phone INTO target_phone FROM service_providers WHERE user_id = target_user_id;
    END IF;

    notification_type := 'new_message';
    message_content := NEW.message;
    
  ELSIF TG_TABLE_NAME = 'service_quotes' THEN
    SELECT client_id INTO target_user_id FROM chat_conversations WHERE id = NEW.conversation_id;
    notification_type := 'new_quote';
    message_content := 'Você recebeu um novo orçamento de R$ ' || NEW.amount;
  END IF;

  payload := jsonb_build_object(
    'type', notification_type,
    'target_user_id', target_user_id,
    'target_phone', target_phone,
    'content', message_content,
    'metadata', jsonb_build_object('table', TG_TABLE_NAME, 'id', NEW.id)
  );

  PERFORM net.http_post(
      url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/notify-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
      ),
      body := payload
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger de Mensagem
DROP TRIGGER IF EXISTS tr_notify_whatsapp_message ON chat_messages;
CREATE TRIGGER tr_notify_whatsapp_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_on_event();


-- PARTE 2: SEGURANÇA E KYC (Verificação)
-- --------------------------------------------------

-- 1. Tabela de Documentos
CREATE TABLE IF NOT EXISTS public.provider_verification_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- 'id_front', 'id_back', 'criminal_record'
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', 
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campos Extras no Prestador
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_started';

-- 3. Políticas RLS
ALTER TABLE public.provider_verification_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can see own docs" ON public.provider_verification_docs;
CREATE POLICY "Providers can see own docs" ON public.provider_verification_docs
    FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Providers can upload own docs" ON public.provider_verification_docs;
CREATE POLICY "Providers can upload own docs" ON public.provider_verification_docs
    FOR INSERT WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- FIM DA MIGRAÇÃO
