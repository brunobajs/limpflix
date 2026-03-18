-- ===============================================
-- LIMPFLIX - ACADEMIA LIMPFLIX SETUP
-- ===============================================

-- 1. Tabela de Conteúdos da Academia
CREATE TABLE IF NOT EXISTS public.academy_contents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT CHECK (content_type IN ('ebook', 'video', 'article')),
    file_url TEXT, -- Link para o PDF ou arquivo
    thumbnail_url TEXT, -- Capa do conteúdo
    category TEXT, -- Ex: 'Vendas', 'Técnico', 'Gestão'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Segurança (RLS)
ALTER TABLE public.academy_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active academy contents" ON public.academy_contents;
CREATE POLICY "Public can read active academy contents" ON public.academy_contents 
FOR SELECT USING (is_active = true);

-- 3. Conteúdo Inicial para Teste
INSERT INTO public.academy_contents (title, description, content_type, file_url, category)
VALUES 
('Guia do Prestador Elite', 'Aprenda como se destacar na plataforma e atrair os melhores clientes.', 'ebook', 'https://example.com/guia.pdf', 'Vendas'),
('Técnicas de Limpeza Pós-Obra', 'O guia definitivo para realizar limpezas pesadas com eficiência.', 'ebook', 'https://example.com/pos-obra.pdf', 'Técnico'),
('Gestão Financeira para Autônomos', 'Como organizar seu dinheiro e aumentar seu lucro líquido.', 'ebook', 'https://example.com/gestao.pdf', 'Gestão')
ON CONFLICT DO NOTHING;
