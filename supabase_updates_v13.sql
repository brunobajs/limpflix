-- ===============================================
-- LimpFlix Database Updates v13 - Registro Atômico (RPC)
-- ===============================================

-- Esta função permite registrar o prestador em uma única transação no servidor,
-- evitando o erro de "Foreign Key" que acontece no frontend.

CREATE OR REPLACE FUNCTION public.register_provider_v2(
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
)
RETURNS VOID AS $$
BEGIN
    -- 1. Garante que o profile existe (Redundância de segurança)
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (p_user_id, p_responsible_name, 'provider')
    ON CONFLICT (id) DO UPDATE SET role = 'provider';

    -- 2. Insere na tabela service_providers
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
    );

    -- 3. Incrementa indicação se necessário
    IF p_referrer_id IS NOT NULL THEN
        UPDATE public.service_providers
        SET total_referrals = total_referrals + 1
        WHERE id = p_referrer_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
