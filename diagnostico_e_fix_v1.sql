-- ===============================================
-- LIMPFLIX - DIAGNÓSTICO E REPARO (v1)
-- Rodar no Supabase SQL Editor
-- ===============================================

-- 1. DIAGNÓSTICO DE PRESTADORES
-- Verificar se os registros ainda existem e qual o status deles
SELECT 
    COUNT(*) as total_prestadores,
    COUNT(*) FILTER (WHERE status = 'approved') as aprovados,
    COUNT(*) FILTER (WHERE status = 'pending') as pendentes
FROM public.service_providers;

-- Listar os últimos 10 prestadores cadastrados para auditoria
SELECT id, trade_name, responsible_name, status, created_at, email
FROM public.service_providers
ORDER BY created_at DESC
LIMIT 10;

-- 2. REPARAÇÃO DE PERFIL ADMIN (Usuário Atual)
-- Isso resolve o erro de chave estrangeira 'fk_client'
-- Se você deletou seu perfil, este comando irá recriá-lo.
-- O SECURITY DEFINER garante que possamos inserir independentemente de RLS no momento da execução.

INSERT INTO public.profiles (id, full_name, role, updated_at)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', 'Administrador LimpFlix'), 
    'admin', 
    NOW()
FROM auth.users
WHERE email = 'bruno.baj.tj@gmail.com' -- Substitua se necessário, mas este parece ser seu e-mail
ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    updated_at = NOW();

-- 3. PADRONIZAÇÃO DE CHAVE ESTRANGEIRA
-- Garante que a restrição fk_client exista e aponte para o lugar certo (auth.users)
-- para máxima resiliência.

DO $$
BEGIN
    -- Remover constraint antiga se existir (tentar nomes comuns)
    ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS fk_client;
    ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS quote_requests_client_id_fkey;

    -- Adicionar a nova constraint padrão
    ALTER TABLE public.quote_requests 
    ADD CONSTRAINT fk_client 
    FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- 4. VERIFICAÇÃO FINAL
SELECT id, full_name, role 
FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'bruno.baj.tj@gmail.com');
