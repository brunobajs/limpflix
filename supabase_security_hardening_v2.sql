-- ===============================================
-- LIMPFLIX - SECURITY HARDENING (v2)
-- Resolve 'auth_users_exposed' and 'rls_disabled_in_public'
-- ===============================================

-- 1. ENABLE RLS ON ALL TABLES (Fixes rls_disabled_in_public)
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


-- 2. RESTRICT PUBLIC ACCESS TO SENSITIVE TABLES
-- Service Providers: Hidden sensitive info by default
DROP POLICY IF EXISTS "Anyone can view providers" ON public.service_providers;
DROP POLICY IF EXISTS "Approved providers visible to authenticated users" ON public.service_providers;

-- Permite ver apenas prestadores aprovados (mas note que isso expõe todos os campos se selecionado p.*)
CREATE POLICY "Public Approved Providers View" ON public.service_providers
  FOR SELECT USING (status = 'approved');

-- Nota: Para segurança total de email e telefone, o ideal seria não ter essas colunas nesta tabela
-- ou usar uma View que selecione apenas campos seguros.


-- 3. SECURE ADMIN RPCs (Fixes auth_users_exposed)
-- Estas funções agora verificam se o chamador é um administrador

DROP FUNCTION IF EXISTS get_admin_clients();
CREATE OR REPLACE FUNCTION get_admin_clients()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    city TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Authorization Check
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar clientes.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        au.email::TEXT,
        p.city,
        p.created_at
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE p.role = 'client'
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-criar get_admin_providers se existir, agora com segurança
DROP FUNCTION IF EXISTS get_admin_providers();
CREATE OR REPLACE FUNCTION get_admin_providers()
RETURNS TABLE (
    id UUID,
    trade_name TEXT,
    responsible_name TEXT,
    email TEXT,
    city TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Authorization Check
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar prestadores.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.trade_name,
        p.responsible_name,
        p.email::TEXT,
        p.city,
        p.status,
        p.created_at
    FROM public.service_providers p
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. REVOKE EXECUTE FROM PUBLIC ROLES
-- Isso garante que as funções não possam ser chamadas por usuários anônimos via API,
-- mesmo que a lógica interna falhasse (camada extra de defesa).
REVOKE EXECUTE ON FUNCTION get_admin_clients() FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_admin_providers() FROM public, anon;


-- 5. ENSURE RLS ON SENSITIVE TABLES WITHOUT POLICIES
-- Vamos garantir que financial_transactions seja assim para anon/public se a tabela existir.

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'financial_transactions') THEN
        ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Providers can see own transactions" ON public.financial_transactions;
        CREATE POLICY "Providers can see own transactions" ON public.financial_transactions
          FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));
    END IF;
END $$;


-- 6. AUDIT STORAGE
-- Se houver uma view expondo auth.users, precisamos encontrá-la.
-- Este script atua sobre as funções conhecidas.

SELECT '✅ Segurança Reforçada!' as status;
