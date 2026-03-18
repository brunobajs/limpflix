-- ===============================================
-- LIMPFLIX - WHATSAPP NOTIFICATION FIX (ANTI-LEAKAGE)
-- Run this in the Supabase SQL Editor
-- ===============================================

CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_event()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  target_user_id UUID;
  target_phone TEXT;
  message_content TEXT;
  notification_type TEXT;
  v_quote_request_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'chat_messages' THEN
    -- Get conversation and provider details
    SELECT 
      CASE WHEN NEW.sender_id = c.client_id THEN (SELECT user_id FROM service_providers WHERE id = c.provider_id) ELSE c.client_id END,
      CASE WHEN NEW.sender_id = c.client_id THEN (SELECT phone FROM service_providers WHERE id = c.provider_id) ELSE NULL END,
      c.quote_request_id
    INTO target_user_id, target_phone, v_quote_request_id
    FROM chat_conversations c
    WHERE c.id = NEW.conversation_id;

    IF target_phone IS NULL THEN
      SELECT phone INTO target_phone FROM service_providers WHERE user_id = target_user_id;
    END IF;

    -- Anti-leakage: We don't send the message content anymore, just the type
    -- The Edge Function will format a generic message.
    -- If it's the first message of a quote request, we use a specific type
    IF v_quote_request_id IS NOT NULL AND (SELECT count(*) FROM chat_messages WHERE conversation_id = NEW.conversation_id) <= 1 THEN
      notification_type := 'new_quote_request';
    ELSE
      notification_type := 'new_message';
    END IF;
    
    message_content := 'Nova notificação no LimpFlix'; -- Generic placeholder

  ELSIF TG_TABLE_NAME = 'service_quotes' THEN
    SELECT client_id INTO target_user_id FROM chat_conversations WHERE id = NEW.conversation_id;
    notification_type := 'new_quote';
    message_content := 'Novo orçamento recebido'; -- Generic placeholder
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
