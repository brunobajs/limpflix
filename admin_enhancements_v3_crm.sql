-- LimpFlix - V3 CRM & Expenses Migration Script
-- Objective: Add external booking support and expense tracking for service providers.

-- 1. Modify service_bookings to support external bookings
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS external_client_name TEXT;
ALTER TABLE public.service_bookings ADD COLUMN IF NOT EXISTS external_client_phone TEXT;

-- Make client_id nullable because external bookings won't have a linked registered user
ALTER TABLE public.service_bookings ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.service_bookings ALTER COLUMN quote_request_id DROP NOT NULL;

-- 2. Create provider_expenses table
CREATE TABLE IF NOT EXISTS public.provider_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Setup RLS for provider_expenses
ALTER TABLE public.provider_expenses ENABLE ROW LEVEL SECURITY;

-- Allow reading own expenses
CREATE POLICY "Providers can read own expenses" 
ON public.provider_expenses
FOR SELECT 
USING (
    provider_id IN (
        SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
);

-- Allow inserting own expenses
CREATE POLICY "Providers can insert own expenses" 
ON public.provider_expenses
FOR INSERT 
WITH CHECK (
    provider_id IN (
        SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
);

-- Allow updating own expenses
CREATE POLICY "Providers can update own expenses" 
ON public.provider_expenses
FOR UPDATE 
USING (
    provider_id IN (
        SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
);

-- Allow deleting own expenses
CREATE POLICY "Providers can delete own expenses" 
ON public.provider_expenses
FOR DELETE 
USING (
    provider_id IN (
        SELECT id FROM public.service_providers WHERE user_id = auth.uid()
    )
);

-- 4. Create an index for performance
CREATE INDEX IF NOT EXISTS idx_provider_expenses_provider_id ON public.provider_expenses(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_expenses_date ON public.provider_expenses(expense_date);
