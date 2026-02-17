-- ===============================================
-- LimpFlix Database Updates v4
-- Apply these in the Supabase SQL Editor
-- ===============================================

-- 1. Make CNPJ mandatory and add image columns to service_providers
ALTER TABLE service_providers 
  ALTER COLUMN cnpj SET NOT NULL,
  ADD COLUMN IF NOT EXISTS logo_image TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_images TEXT[] DEFAULT '{}';

-- 2. Add last_read_at to chat_conversations for notification badges
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS client_last_read_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS provider_last_read_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure Storage Bucket for media exists (Note: Buckets are usually managed via API/Dashboard, 
-- but we can add helpful comments or RLS policies here if needed)
-- Note: User MUST create 'providers-media' bucket in Supabase Storage dashboard manually as public.
