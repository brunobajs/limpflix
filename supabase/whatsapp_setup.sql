-- ===============================================
-- WhatsApp Notification Triggers
-- LimpFlix - 2026-03-09
-- ===============================================

-- 1. Function to call the Edge Function for WhatsApp notification
CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_event()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  target_user_id UUID;
  target_phone TEXT;
  message_content TEXT;
  notification_type TEXT;
BEGIN
  -- Determine notification type and payload based on table
    IF TG_TABLE_NAME = 'chat_messages' THEN
    -- Get the conversation to find the recipient
    SELECT 
      CASE 
        WHEN NEW.sender_id = c.client_id THEN (SELECT user_id FROM service_providers WHERE id = c.provider_id)
        ELSE c.client_id 
      END,
      CASE 
        WHEN NEW.sender_id = c.client_id THEN (SELECT phone FROM service_providers WHERE id = c.provider_id)
        ELSE NULL -- Phone for client usually comes from profiles or a specific field
      END
    INTO target_user_id, target_phone
    FROM chat_conversations c
    WHERE c.id = NEW.conversation_id;

    -- If target_phone is null, try to get from profiles
    IF target_phone IS NULL THEN
      -- Try to get from providers table first
      SELECT phone INTO target_phone FROM service_providers WHERE user_id = target_user_id;
      -- If still null, could check a hypothetical profiles.phone
    END IF;

    notification_type := 'new_message';
    message_content := NEW.message;
    
  ELSIF TG_TABLE_NAME = 'service_quotes' THEN
    -- Notify client about new quote
    SELECT client_id INTO target_user_id FROM chat_conversations WHERE id = NEW.conversation_id;
    -- Logic to get client phone... (assuming it's in a profiles or similar table)
    -- For now, target_phone will be fetched by the Edge Function if not provided here
    
    notification_type := 'new_quote';
    message_content := 'Você recebeu um novo orçamento de R$ ' || NEW.amount;
  END IF;

  -- Create payload
  payload := jsonb_build_object(
    'type', notification_type,
    'target_user_id', target_user_id,
    'target_phone', target_phone,
    'content', message_content,
    'metadata', jsonb_build_object(
      'table', TG_TABLE_NAME,
      'id', NEW.id
    )
  );

  -- Perform the HTTP request to Supabase Edge Function
  -- Note: Replace URL with your project URL in production
  PERFORM
    net.http_post(
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

-- 2. Triggers
DROP TRIGGER IF EXISTS tr_notify_whatsapp_message ON chat_messages;
CREATE TRIGGER tr_notify_whatsapp_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_whatsapp_on_event();

-- Note: Ensure "pg_net" extension is enabled in Supabase for net.http_post
-- CREATE EXTENSION IF NOT EXISTS pg_net;
