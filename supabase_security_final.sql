-- ===============================================
-- LIMPFLIX - SEGURANÇA FINAL (RLS)
-- Habilita RLS em todas as tabelas e define políticas de acesso
-- ===============================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS DO SCHEMA PUBLIC
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 2. POLÍTICAS PARA 'PROFILES'
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. POLÍTICAS PARA 'SERVICE_PROVIDERS'
DROP POLICY IF EXISTS "Approved providers are public" ON public.service_providers;
CREATE POLICY "Approved providers are public" ON public.service_providers
  FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Providers can see own data" ON public.service_providers;
CREATE POLICY "Providers can see own data" ON public.service_providers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can register as provider" ON public.service_providers;
CREATE POLICY "Anyone can register as provider" ON public.service_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Providers can update own data" ON public.service_providers;
CREATE POLICY "Providers can update own data" ON public.service_providers
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. POLÍTICAS PARA 'SERVICE_CATEGORIES'
DROP POLICY IF EXISTS "Categories are public" ON public.service_categories;
CREATE POLICY "Categories are public" ON public.service_categories
  FOR SELECT USING (true);

-- 5. POLÍTICAS PARA 'SERVICE_BOOKINGS'
DROP POLICY IF EXISTS "Providers can see own bookings" ON public.service_bookings;
CREATE POLICY "Providers can see own bookings" ON public.service_bookings
  FOR SELECT USING (
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Clients can see own bookings" ON public.service_bookings;
CREATE POLICY "Clients can see own bookings" ON public.service_bookings
  FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can create booking" ON public.service_bookings;
CREATE POLICY "Anyone can create booking" ON public.service_bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Providers can update own bookings" ON public.service_bookings;
CREATE POLICY "Providers can update own bookings" ON public.service_bookings
  FOR UPDATE USING (
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );

-- 6. POLÍTICAS PARA 'CHAT_CONVERSATIONS'
DROP POLICY IF EXISTS "Users can see own conversations" ON public.chat_conversations;
CREATE POLICY "Users can see own conversations" ON public.chat_conversations
  FOR SELECT USING (
    client_id = auth.uid() OR
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can create conversation" ON public.chat_conversations;
CREATE POLICY "Anyone can create conversation" ON public.chat_conversations
  FOR INSERT WITH CHECK (true);

-- 7. POLÍTICAS PARA 'CHAT_MESSAGES'
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
  FOR INSERT WITH CHECK (true);

-- 8. POLÍTICAS PARA 'FINANCIAL_TRANSACTIONS' (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_transactions') THEN
        DROP POLICY IF EXISTS "Providers can see own transactions" ON public.financial_transactions;
        CREATE POLICY "Providers can see own transactions" ON public.financial_transactions
          FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));
    END IF;
END $$;

-- 9. SEGURANÇA ADICIONAL PARA FUNÇÕES RPC
-- Garante que funções administrativas verifiquem o papel de admin
-- get_admin_clients
CREATE OR REPLACE FUNCTION get_admin_clients()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, city TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;
    RETURN QUERY SELECT p.id, p.full_name, au.email::TEXT, p.city, p.created_at
    FROM public.profiles p LEFT JOIN auth.users au ON p.id = au.id
    WHERE p.role = 'client' ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_admin_providers
CREATE OR REPLACE FUNCTION get_admin_providers()
RETURNS TABLE (id UUID, trade_name TEXT, responsible_name TEXT, email TEXT, city TEXT, status TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;
    RETURN QUERY SELECT p.id, p.trade_name, p.responsible_name, p.email::TEXT, p.city, p.status, p.created_at
    FROM public.service_providers p ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION get_admin_clients() FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_admin_providers() FROM public, anon;

SELECT '✅ Segurança e RLS configurados com sucesso!' as status;
