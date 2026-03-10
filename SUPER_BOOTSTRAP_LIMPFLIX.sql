-- ===============================================
-- LIMPFLIX - SUPER BOOTSTRAP (ESTRUTURA COMPLETA)
-- Data: 2026-03-09
-- Use este script em um NOVO projeto Supabase para restaurar tudo.
-- ===============================================

-- 0. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. PROFILES (Extensão do auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'client', -- client, provider, admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. SERVICE PROVIDERS
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT,
  responsible_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bio TEXT,
  profile_image TEXT,
  logo_image TEXT,
  portfolio_images TEXT[],
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  services_offered TEXT[] DEFAULT '{}',
  pix_key TEXT,
  status TEXT DEFAULT 'approved',
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_reviews INT DEFAULT 0,
  total_services INT DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  pending_balance DECIMAL(10,2) DEFAULT 0,
  referral_code TEXT UNIQUE,
  referrer_id UUID REFERENCES public.service_providers(id),
  total_referrals INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'not_started',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_location ON public.service_providers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_providers_city ON public.service_providers(city);
CREATE INDEX IF NOT EXISTS idx_providers_status ON public.service_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_services ON public.service_providers USING GIN(services_offered);
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON public.service_providers(user_id);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved providers are public" ON public.service_providers FOR SELECT USING (status = 'approved');
CREATE POLICY "Providers can see own data" ON public.service_providers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can register as provider" ON public.service_providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Providers can update own data" ON public.service_providers FOR UPDATE USING (auth.uid() = user_id);

-- 3. SERVICE CATEGORIES
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  base_price DECIMAL(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.service_categories FOR SELECT USING (true);

INSERT INTO public.service_categories (name, slug, description, base_price) VALUES
  ('Limpeza de Sofá', 'limpeza-sofa', 'Limpeza profissional de sofás de tecido, couro e sintéticos.', 100),
  ('Limpeza de Colchão', 'limpeza-colchao', 'Higienização completa de colchões com eliminação de ácaros.', 80),
  ('Limpeza de Carpete', 'limpeza-carpete', 'Lavagem profunda de carpetes residenciais e comerciais.', 120),
  ('Limpeza de Cortinas', 'limpeza-cortinas', 'Lavagem de cortinas com retirada e colocação.', 60),
  ('Limpeza de Pisos', 'limpeza-pisos', 'Limpeza e revitalização de pisos diversos.', 150),
  ('Limpeza de Caixa d''Água', 'limpeza-caixa-dagua', 'Limpeza, desinfecção e vedação de caixas d''água.', 200),
  ('Limpeza de Vidros', 'limpeza-vidros', 'Limpeza de vidros e esquadrias.', 100),
  ('Limpeza de Fachada', 'limpeza-fachada', 'Limpeza de fachadas com hidrojateamento.', 500),
  ('Limpeza Pós-Obra', 'limpeza-pos-obra', 'Limpeza completa após reforma ou construção.', 300),
  ('Higienização', 'higienizacao', 'Higienização profissional de ambientes.', 150),
  ('Limpeza Comercial', 'limpeza-comercial', 'Serviços de limpeza para espaços comerciais.', 250)
ON CONFLICT (slug) DO NOTHING;

-- 4. CHAT CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  provider_id UUID REFERENCES public.service_providers(id),
  provider_name TEXT,
  service_name TEXT,
  status TEXT DEFAULT 'active',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own conversations" ON public.chat_conversations FOR SELECT USING (client_id = auth.uid() OR provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can create conversation" ON public.chat_conversations FOR INSERT WITH CHECK (true);

-- 5. SERVICE QUOTES (ORÇAMENTOS)
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

ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can manage their own quotes" ON public.service_quotes FOR ALL USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Clients can view quotes sent to them" ON public.service_quotes FOR SELECT USING (client_id = auth.uid());

-- 6. SERVICE BOOKINGS
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.service_providers(id),
  client_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  client_phone TEXT,
  service_name TEXT,
  service_category_id UUID REFERENCES public.service_categories(id),
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  provider_amount DECIMAL(10,2),
  platform_commission DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending',
  rating INT,
  review TEXT,
  quote_id UUID REFERENCES public.service_quotes(id),
  platform_fee DECIMAL(10,2) DEFAULT 0,
  provider_net_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can see own bookings" ON public.service_bookings FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Clients can see own bookings" ON public.service_bookings FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Anyone can create booking" ON public.service_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Providers can update own bookings" ON public.service_bookings FOR UPDATE USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- 7. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT,
  message TEXT,
  attachments TEXT[],
  is_quote BOOLEAN DEFAULT false,
  quote_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see messages from own conversations" ON public.chat_messages FOR SELECT USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE client_id = auth.uid() OR provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())));
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- 8. KYC DOCUMENTS
CREATE TABLE IF NOT EXISTS public.provider_verification_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID REFERENCES public.service_providers(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, 
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', 
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.provider_verification_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can see own docs" ON public.provider_verification_docs FOR SELECT USING (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));
CREATE POLICY "Providers can upload own docs" ON public.provider_verification_docs FOR INSERT WITH CHECK (provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid()));

-- 9. BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('providers-media', 'providers-media', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'providers-media');
CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'providers-media');
CREATE POLICY "Allow delete" ON storage.objects FOR DELETE USING (bucket_id = 'providers-media');

-- 10. FUNCTIONS & TRIGGERS (REFERRAL & AUTH)

-- Função para gerar código numérico de 5 dígitos único
CREATE OR REPLACE FUNCTION fn_generate_unique_5_digit_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_code := floor(random() * 90000 + 10000)::TEXT;
        SELECT EXISTS (SELECT 1 FROM public.service_providers WHERE referral_code = v_code) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para garantir que todo novo prestador tenha um código de 5 dígitos
CREATE OR REPLACE FUNCTION tr_ensure_referral_code_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' OR LENGTH(NEW.referral_code) > 8 THEN
        NEW.referral_code := fn_generate_unique_5_digit_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_referral_code ON public.service_providers;
CREATE TRIGGER tr_ensure_referral_code
BEFORE INSERT ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION tr_ensure_referral_code_fn();

-- Função RPC para validar código e retornar o ID do prestador (referrer_id)
CREATE OR REPLACE FUNCTION get_provider_id_by_code(p_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_provider_id UUID;
BEGIN
    SELECT id INTO v_provider_id FROM public.service_providers WHERE referral_code = p_code LIMIT 1;
    RETURN v_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar campo de indicação na tabela de perfis (para clientes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID REFERENCES public.service_providers(id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    -- Se houver código de indicação no metadata do auth
    IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
        SELECT id INTO v_referrer_id 
        FROM public.service_providers 
        WHERE referral_code = NEW.raw_user_meta_data->>'referred_by_code' 
        LIMIT 1;
    END IF;

    INSERT INTO public.profiles (id, full_name, role, referred_by_provider_id)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário LimpFlix'), 
        'client',
        v_referrer_id
    )
    ON CONFLICT (id) DO UPDATE SET 
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        referred_by_provider_id = COALESCE(v_referrer_id, profiles.referred_by_provider_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.register_provider_v3(
    p_user_id UUID, p_legal_name TEXT, p_trade_name TEXT, p_cnpj TEXT, p_bio TEXT,
    p_responsible_name TEXT, p_phone TEXT, p_email TEXT, p_address TEXT, p_city TEXT, p_state TEXT,
    p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION, p_services_offered TEXT[],
    p_profile_image TEXT, p_logo_image TEXT, p_portfolio_images TEXT[],
    p_pix_key TEXT, p_referral_code TEXT, p_referrer_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (p_user_id, p_responsible_name, 'provider')
    ON CONFLICT (id) DO UPDATE SET role = 'provider';
    INSERT INTO public.service_providers (
        user_id, legal_name, trade_name, cnpj, bio, 
        responsible_name, phone, email, address, city, state,
        latitude, longitude, services_offered, profile_image,
        logo_image, portfolio_images, pix_key, referral_code,
        referrer_id, status
    ) VALUES (
        p_user_id, p_legal_name, p_trade_name, p_cnpj, p_bio,
        p_responsible_name, p_phone, p_email, p_address, p_city, p_state,
        p_latitude, p_longitude, p_services_offered, p_profile_image,
        p_logo_image, p_portfolio_images, p_pix_key, p_referral_code,
        p_referrer_id, 'approved'
    ) ON CONFLICT (user_id) DO UPDATE SET status = 'approved', updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_whatsapp_on_event()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  target_user_id UUID;
  target_phone TEXT;
  message_content TEXT;
  notification_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'chat_messages' THEN
    SELECT 
      CASE WHEN NEW.sender_id = c.client_id THEN (SELECT user_id FROM service_providers WHERE id = c.provider_id) ELSE c.client_id END,
      CASE WHEN NEW.sender_id = c.client_id THEN (SELECT phone FROM service_providers WHERE id = c.provider_id) ELSE NULL END
    INTO target_user_id, target_phone
    FROM chat_conversations c
    WHERE c.id = NEW.conversation_id;
    IF target_phone IS NULL THEN SELECT phone INTO target_phone FROM service_providers WHERE user_id = target_user_id; END IF;
    notification_type := 'new_message';
    message_content := NEW.message;
  ELSIF TG_TABLE_NAME = 'service_quotes' THEN
    SELECT client_id INTO target_user_id FROM chat_conversations WHERE id = NEW.conversation_id;
    notification_type := 'new_quote';
    message_content := 'Você recebeu um novo orçamento de R$ ' || NEW.amount;
  END IF;
  payload := jsonb_build_object('type', notification_type, 'target_user_id', target_user_id, 'target_phone', target_phone, 'content', message_content, 'metadata', jsonb_build_object('table', TG_TABLE_NAME, 'id', NEW.id));
  PERFORM net.http_post(
      url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/notify-whatsapp',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'),
      body := payload
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_notify_whatsapp_message ON public.chat_messages;
CREATE TRIGGER tr_notify_whatsapp_message AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.notify_whatsapp_on_event();

CREATE OR REPLACE FUNCTION public.increment_referrals(provider_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.service_providers SET total_referrals = total_referrals + 1 WHERE id = provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
