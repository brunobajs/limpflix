-- ===============================================
-- LIMPFLIX - SCHEMA RECOVERY & CHAT ALIGNMENT
-- Run this in the Supabase SQL Editor
-- ===============================================

-- 1. Create Quote Requests Table
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id),
  service_category_id UUID REFERENCES public.service_categories(id),
  description TEXT,
  media_urls TEXT[], 
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  status TEXT DEFAULT 'open', -- open, completed, expired
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update Service Providers
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;

-- 3. Update Chat Conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS quote_request_id UUID REFERENCES public.quote_requests(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'booked'));

-- 4. Enable RLS and Policies for Quote Requests
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can see quote requests" ON public.quote_requests;
CREATE POLICY "Public can see quote requests" ON public.quote_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create quote requests" ON public.quote_requests;
CREATE POLICY "Authenticated users can create quote requests" ON public.quote_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own quote requests" ON public.quote_requests;
CREATE POLICY "Users can update own quote requests" ON public.quote_requests FOR UPDATE USING (auth.uid() = client_id);

-- 5. Extra Fix: Ensure chat_messages has 'message' column (should already exist, but just in case)
-- Frontend will be updated from 'content' to 'message'.
-- If you want to use 'content' instead of 'message', uncomment the following line:
-- ALTER TABLE public.chat_messages RENAME COLUMN message TO content;
-- However, we recommend updating the frontend to match the existing schema.
