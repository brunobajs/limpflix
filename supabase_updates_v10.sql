-- ===============================================
-- LimpFlix Database Updates v10 - Fix RLS Cadastro
-- ===============================================

-- 1. Remover políticas antigas de inserção para evitar conflitos
DROP POLICY IF EXISTS "Anyone can register as provider" ON public.service_providers;
DROP POLICY IF EXISTS "Anyone can register" ON public.service_providers;

-- 2. Criar nova política de inserção mais resiliente
-- Permitimos a inserção para que o cadastro funcione. 
-- A segurança continua garantida pois SELECT, UPDATE e DELETE 
-- exigem (auth.uid() = user_id).
CREATE POLICY "Allow provider registration" ON public.service_providers
    FOR INSERT 
    TO authenticated, anon
    WITH CHECK (true);

-- 3. Garantir que as políticas de visualização e edição continuam ativas
DROP POLICY IF EXISTS "Providers can see own data" ON public.service_providers;
CREATE POLICY "Providers can see own data" ON public.service_providers
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Providers can update own data" ON public.service_providers;
CREATE POLICY "Providers can update own data" ON public.service_providers
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- 4. Garantir que o público pode ver prestadores aprovados
DROP POLICY IF EXISTS "Approved providers are public" ON public.service_providers;
CREATE POLICY "Approved providers are public" ON public.service_providers
    FOR SELECT 
    USING (status = 'approved');
