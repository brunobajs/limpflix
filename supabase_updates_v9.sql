-- ===============================================
-- LimpFlix Database Updates v9 - Sistema de Orçamentos
-- ===============================================

-- 1. Tabela de Orçamentos/Propostas
CREATE TABLE IF NOT EXISTS public.service_quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'paid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)
-- Profissionais podem ver e criar orçamentos vinculados a eles
CREATE POLICY "Providers can manage their own quotes" ON public.service_quotes
    FOR ALL USING (
        provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
    );

-- Clientes podem ver orçamentos enviados para eles
CREATE POLICY "Clients can view quotes sent to them" ON public.service_quotes
    FOR SELECT USING (
        client_id = auth.uid()
    );

-- 4. Atualizar service_bookings para suportar o vínculo com orçamento e taxas
ALTER TABLE public.service_bookings
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.service_quotes(id),
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS provider_net_amount DECIMAL(10,2) DEFAULT 0;

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_quotes_updated_at
    BEFORE UPDATE ON public.service_quotes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
