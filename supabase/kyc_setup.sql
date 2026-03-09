-- ===============================================
-- KYC (Know Your Customer) Tables
-- LimpFlix - 2026-03-09
-- ===============================================

-- 1. Create KYC documents table
CREATE TABLE IF NOT EXISTS public.provider_verification_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- 'id_front', 'id_back', 'criminal_record'
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add verification fields to service_providers if they don't exist
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'not_started'; -- 'not_started', 'pending', 'verified', 'rejected'

-- 3. RLS Policies
ALTER TABLE public.provider_verification_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can see own docs" ON public.provider_verification_docs
    FOR SELECT USING (
        provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
    );

CREATE POLICY "Providers can upload own docs" ON public.provider_verification_docs
    FOR INSERT WITH CHECK (
        provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
    );

-- 4. Storage Bucket (Run this via Supabase UI or API if possible)
-- Requires manual setup of 'verification-docs' bucket usually
