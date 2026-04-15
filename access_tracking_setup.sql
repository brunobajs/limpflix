-- ===============================================
-- LIMPFLIX - CONTADOR DE ACESSOS
-- Criação da tabela de logs e políticas de acesso
-- ===============================================

-- 1. CRIAR TABELA DE LOGS DE ACESSO
CREATE TABLE IF NOT EXISTS public.platform_access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    path TEXT,
    user_agent TEXT,
    referrer TEXT,
    session_id TEXT -- Opcional: para identificar sessões únicas no frontend
);

-- 2. HABILITAR RLS
ALTER TABLE public.platform_access_logs ENABLE ROW LEVEL SECURITY;

-- 3. PERMITIR INSERÇÃO ANÔNIMA (Rastreamento Público)
DROP POLICY IF EXISTS "Anyone can insert access logs" ON public.platform_access_logs;
CREATE POLICY "Anyone can insert access logs" ON public.platform_access_logs
    FOR INSERT WITH CHECK (true);

-- 4. PERMITIR APENAS ADMS VEREM OS LOGS
DROP POLICY IF EXISTS "Admins can view access logs" ON public.platform_access_logs;
CREATE POLICY "Admins can view access logs" ON public.platform_access_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 5. ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_access_logs_date ON public.platform_access_logs(accessed_at);

SELECT '✅ Tabela de logs de acesso criada com sucesso!' as status;
