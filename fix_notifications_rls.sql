-- Fix RLS for service_quotes
-- Enable RLS if not enabled
ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;

-- Policy for clients to see their own quotes
DROP POLICY IF EXISTS "Clients can view their quotes" ON public.service_quotes;
CREATE POLICY "Clients can view their quotes" ON public.service_quotes
  FOR SELECT USING (client_id = auth.uid());

-- Policy for providers to see their quotes
DROP POLICY IF EXISTS "Providers can view their quotes" ON public.service_quotes;
CREATE POLICY "Providers can view their quotes" ON public.service_quotes
  FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- Policy for clients to update their own quotes
DROP POLICY IF EXISTS "Clients can update their quotes" ON public.service_quotes;
CREATE POLICY "Clients can update their quotes" ON public.service_quotes
  FOR UPDATE USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Policy for providers to update their quotes
DROP POLICY IF EXISTS "Providers can update their quotes" ON public.service_quotes;
CREATE POLICY "Providers can update their quotes" ON public.service_quotes
  FOR UPDATE USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- Fix RLS for service_bookings
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their bookings" ON public.service_bookings;
CREATE POLICY "Clients can view their bookings" ON public.service_bookings
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Providers can view their bookings" ON public.service_bookings;
CREATE POLICY "Providers can view their bookings" ON public.service_bookings
  FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Clients can update their bookings" ON public.service_bookings;
CREATE POLICY "Clients can update their bookings" ON public.service_bookings
  FOR UPDATE USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Providers can update their bookings" ON public.service_bookings;
CREATE POLICY "Providers can update their bookings" ON public.service_bookings
  FOR UPDATE USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- Fix RLS for chat_conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own conversations" ON public.chat_conversations;
CREATE POLICY "Users can see own conversations" ON public.chat_conversations
  FOR SELECT USING (
    client_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;
CREATE POLICY "Users can create conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations" ON public.chat_conversations
  FOR UPDATE USING (
    client_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );

-- Fix RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see messages from own conversations" ON public.chat_messages;
CREATE POLICY "Users can see messages from own conversations" ON public.chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations
      WHERE client_id = auth.uid() OR
        provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure realtime is enabled for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE service_quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE service_bookings;
