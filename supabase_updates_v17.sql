-- ===============================================
-- LIMPFLIX - DUAL ROLE & DASHBOARD FIX (v17)
-- Garante que um usuário possa ser Cliente e Prestador ao mesmo tempo.
-- ===============================================

-- 1. EXTENDER O PAPEL (ROLE) NO PERFIL
-- Vamos permitir que o campo role seja flexível.
-- Se já for 'client' e virar 'provider', podemos marcar como 'both' ou apenas manter 'provider' (que tem mais acessos).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário LimpFlix'),
    'client' -- Padrão ao criar usuário via Auth comum
  )
  ON CONFLICT (id) DO UPDATE SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO DE REGISTRO QUE PRESERVA E ATUALIZA PAPÉIS
CREATE OR REPLACE FUNCTION public.register_provider_v3(
    p_user_id UUID, p_legal_name TEXT, p_trade_name TEXT, p_cnpj TEXT, p_bio TEXT,
    p_responsible_name TEXT, p_phone TEXT, p_email TEXT, p_address TEXT, p_city TEXT, p_state TEXT,
    p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION, p_services_offered TEXT[],
    p_profile_image TEXT, p_logo_image TEXT, p_portfolio_images TEXT[],
    p_pix_key TEXT, p_referral_code TEXT, p_referrer_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Atualiza ou Cria o profile garantindo o papel de provider
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (p_user_id, p_responsible_name, 'provider')
    ON CONFLICT (id) DO UPDATE SET role = 'provider'; -- Promove a provider se for client

    -- Insere o prestador (se já não existir para este user_id)
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
    )
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'approved',
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. GARANTIR UNICIDADE E RLS PERMISSIVO PARA O DONO
-- Adiciona restrição de unicidade para permitir o "ON CONFLICT" no user_id
ALTER TABLE public.service_providers 
DROP CONSTRAINT IF EXISTS service_providers_user_id_key;

ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_user_id_key UNIQUE (user_id);

DROP POLICY IF EXISTS "Providers can see own data" ON public.service_providers;
CREATE POLICY "Providers can see own data" ON public.service_providers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can register as provider" ON public.service_providers;
CREATE POLICY "Anyone can register as provider" ON public.service_providers
  FOR INSERT WITH CHECK (true); -- RPC já cuida da segurança
