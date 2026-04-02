-- Fix ALL RLS policies for LimpFlix

-- Enable RLS on all tables if not enabled
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_payouts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service Providers policies
DROP POLICY IF EXISTS "Anyone can view providers" ON public.service_providers;
CREATE POLICY "Anyone can view providers" ON public.service_providers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own provider profile" ON public.service_providers;
CREATE POLICY "Users can view own provider profile" ON public.service_providers
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own provider" ON public.service_providers;
CREATE POLICY "Users can update own provider" ON public.service_providers
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert provider" ON public.service_providers;
CREATE POLICY "Users can insert provider" ON public.service_providers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Chat Conversations policies
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

-- Chat Messages policies
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

-- Service Quotes policies
DROP POLICY IF EXISTS "Clients can view their quotes" ON public.service_quotes;
CREATE POLICY "Clients can view their quotes" ON public.service_quotes
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Providers can view their quotes" ON public.service_quotes;
CREATE POLICY "Providers can view their quotes" ON public.service_quotes
  FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Clients can update their quotes" ON public.service_quotes;
CREATE POLICY "Clients can update their quotes" ON public.service_quotes
  FOR UPDATE USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Providers can update their quotes" ON public.service_quotes;
CREATE POLICY "Providers can update their quotes" ON public.service_quotes
  FOR UPDATE USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- Service Bookings policies
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

-- Financial Transactions policies
DROP POLICY IF EXISTS "Providers can see own transactions" ON public.financial_transactions;
CREATE POLICY "Providers can see own transactions" ON public.financial_transactions
  FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- Wallet Payouts policies
DROP POLICY IF EXISTS "Providers can view own payouts" ON public.wallet_payouts;
CREATE POLICY "Providers can view own payouts" ON public.wallet_payouts
  FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Providers can create payouts" ON public.wallet_payouts;
CREATE POLICY "Providers can create payouts" ON public.wallet_payouts
  FOR INSERT WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- Enable Realtime for all chat and notification tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE service_quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE service_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE financial_transactions;
