-- ===============================================
-- LimpFlix Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- ===============================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'client', -- client, provider, admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Service Providers
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT,
  responsible_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  bio TEXT,
  profile_image TEXT,
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
  referrer_id UUID REFERENCES service_providers(id),
  total_referrals INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient search
CREATE INDEX IF NOT EXISTS idx_providers_location ON service_providers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_providers_city ON service_providers(city);
CREATE INDEX IF NOT EXISTS idx_providers_status ON service_providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_services ON service_providers USING GIN(services_offered);
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON service_providers(user_id);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- ANYONE can see approved providers (THIS IS THE KEY FIX!)
CREATE POLICY "Approved providers are public" ON service_providers
  FOR SELECT USING (status = 'approved');

-- Provider owners can also see their own (even if pending)
CREATE POLICY "Providers can see own data" ON service_providers
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can insert (registration)
CREATE POLICY "Anyone can register as provider" ON service_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Providers can update their own data
CREATE POLICY "Providers can update own data" ON service_providers
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
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

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON service_categories FOR SELECT USING (true);

-- Seed service categories
INSERT INTO service_categories (name, slug, description, base_price) VALUES
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

-- 4. Service Bookings
CREATE TABLE IF NOT EXISTS service_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES service_providers(id),
  client_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  client_phone TEXT,
  service_name TEXT,
  service_category_id UUID REFERENCES service_categories(id),
  scheduled_date DATE,
  scheduled_time TEXT,
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  provider_amount DECIMAL(10,2),
  platform_commission DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending',
  rating INT,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can see own bookings" ON service_bookings
  FOR SELECT USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can see own bookings" ON service_bookings
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Anyone can create booking" ON service_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Providers can update own bookings" ON service_bookings
  FOR UPDATE USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- 5. Chat Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id),
  client_name TEXT,
  provider_id UUID REFERENCES service_providers(id),
  provider_name TEXT,
  service_name TEXT,
  status TEXT DEFAULT 'active',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own conversations" ON chat_conversations
  FOR SELECT USING (
    client_id = auth.uid() OR
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can create conversation" ON chat_conversations
  FOR INSERT WITH CHECK (true);

-- 6. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT,
  message TEXT,
  attachments TEXT[],
  is_quote BOOLEAN DEFAULT false,
  quote_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see messages from own conversations" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM chat_conversations
      WHERE client_id = auth.uid() OR
        provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- 7. Helper function for referral counting
CREATE OR REPLACE FUNCTION increment_referrals(provider_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE service_providers
  SET total_referrals = total_referrals + 1
  WHERE id = provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
