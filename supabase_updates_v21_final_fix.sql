-- ===============================================
-- LIMPFLIX - V21 - FIX DEFINITIVO PARA CADASTRO DE CLIENTES & PROFISSIONAIS
-- Por favor, rode este script no SQL Editor do Supabase.
-- ===============================================

-- 1. Garante que a coluna de indicação existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID REFERENCES public.service_providers(id);

-- 2. Recria a função de forma 100% segura
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID := NULL;
    v_code TEXT;
BEGIN
    -- Ignorar qualquer erro grave
    BEGIN
        v_code := NEW.raw_user_meta_data->>'referred_by_code';
        IF v_code IS NOT NULL AND v_code != '' THEN
            SELECT id INTO v_referrer_id 
            FROM public.service_providers 
            WHERE referral_code = v_code 
            LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_referrer_id := NULL;
    END;

    BEGIN
        INSERT INTO public.profiles (id, full_name, role, referred_by_provider_id)
        VALUES (
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário LimpFlix'), 
            'client',
            v_referrer_id
        )
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            referred_by_provider_id = EXCLUDED.referred_by_provider_id;
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, apenas retorne
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconecta o trigger na tabela auth.users com Drop Seguro de qualquer trigger anterior
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS tr_ensure_referral_code ON auth.users;

CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Função RPC para registrar provedor com segurança (v4)
CREATE OR REPLACE FUNCTION register_provider_v4(
    p_user_id UUID,
    p_legal_name TEXT,
    p_trade_name TEXT,
    p_cnpj TEXT,
    p_bio TEXT,
    p_responsible_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_services_offered TEXT[],
    p_profile_image TEXT,
    p_logo_image TEXT,
    p_portfolio_images TEXT[],
    p_pix_key TEXT,
    p_referral_code TEXT,
    p_referrer_id UUID
) RETURNS void AS $$
BEGIN
    -- 1. Update Profile (Upsert safely)
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (p_user_id, p_responsible_name, 'provider')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = 'provider';

    -- 2. Insert or update service provider
    INSERT INTO public.service_providers (
        user_id, legal_name, trade_name, cnpj, bio, responsible_name, phone, email, 
        address, city, state, latitude, longitude, services_offered, 
        profile_image, logo_image, portfolio_images, pix_key, referral_code, referrer_id, status
    ) VALUES (
        p_user_id, p_legal_name, p_trade_name, p_cnpj, p_bio, p_responsible_name, p_phone, p_email,
        p_address, p_city, p_state, p_latitude, p_longitude, p_services_offered,
        p_profile_image, p_logo_image, p_portfolio_images, p_pix_key, p_referral_code, p_referrer_id, 'approved'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        trade_name = EXCLUDED.trade_name,
        cnpj = EXCLUDED.cnpj,
        bio = EXCLUDED.bio,
        responsible_name = EXCLUDED.responsible_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        services_offered = EXCLUDED.services_offered,
        profile_image = EXCLUDED.profile_image,
        logo_image = EXCLUDED.logo_image,
        portfolio_images = EXCLUDED.portfolio_images,
        pix_key = EXCLUDED.pix_key,
        referral_code = COALESCE(service_providers.referral_code, EXCLUDED.referral_code),
        referrer_id = EXCLUDED.referrer_id,
        status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
