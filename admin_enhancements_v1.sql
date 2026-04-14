-- ===============================================
-- 1. ADICIONAR CAMPO 'city' NA TABELA PROFILES
-- ===============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;


-- ===============================================
-- 2. ATUALIZAR TRIGGER "handle_new_user"
-- Isso permite salvar a cidade no momento do cadastro do cliente
-- ===============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, city)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'city'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===============================================
-- 3. RE-CRIAR RPC get_admin_clients PARA INCLUIR CITY
-- ===============================================
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
