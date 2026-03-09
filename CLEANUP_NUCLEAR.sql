-- ===============================================
-- LIMPFLIX - LIMPEZA NUCLEAR E FIX DE CONSTRANGIMENTO
-- Use este script se o anterior deu erro de "ON CONFLICT"
-- ===============================================

-- 1. REMOVER DUPLICADOS (Mantém apenas o registro mais recente por usuário)
DELETE FROM public.service_providers a
USING public.service_providers b
WHERE a.id < b.id 
  AND a.user_id = b.user_id;

-- 2. GARANTIR A CONSTRAINT DE UNICIDADE
-- Agora que não há duplicados, o comando abaixo DEVE funcionar.
ALTER TABLE public.service_providers 
DROP CONSTRAINT IF EXISTS service_providers_user_id_key;

ALTER TABLE public.service_providers 
ADD CONSTRAINT service_providers_user_id_key UNIQUE (user_id);

-- 3. CRIAR O PERFIL DO BRUNO (CASO NÃO EXISTA)
-- ID: fb81202f-dff9-4adf-9a4f-eacc1b31fd9d
INSERT INTO public.profiles (id, full_name, role)
VALUES ('fb81202f-dff9-4adf-9a4f-eacc1b31fd9d', 'BRUNO RODRIGUES', 'provider')
ON CONFLICT (id) DO UPDATE SET role = 'provider';

-- 4. RE-CRIAR A FUNÇÃO DE REGISTRO V3 (ULTRA RESILIENTE)
CREATE OR REPLACE FUNCTION public.register_provider_v3(
    p_user_id UUID, p_legal_name TEXT, p_trade_name TEXT, p_cnpj TEXT, p_bio TEXT,
    p_responsible_name TEXT, p_phone TEXT, p_email TEXT, p_address TEXT, p_city TEXT, p_state TEXT,
    p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION, p_services_offered TEXT[],
    p_profile_image TEXT, p_logo_image TEXT, p_portfolio_images TEXT[],
    p_pix_key TEXT, p_referral_code TEXT, p_referrer_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Parte 1: Perfil (Security Definer ignora RLS)
    INSERT INTO public.profiles (id, full_name, role, updated_at)
    VALUES (p_user_id, p_responsible_name, 'provider', NOW())
    ON CONFLICT (id) DO UPDATE SET 
        role = 'provider',
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- Parte 2: Prestador (Usa o user_id_key que acabamos de criar)
    INSERT INTO public.service_providers (
        user_id, legal_name, trade_name, cnpj, bio, 
        responsible_name, phone, email, address, city, state,
        latitude, longitude, services_offered, profile_image,
        logo_image, portfolio_images, pix_key, referral_code,
        referrer_id, status, updated_at
    ) VALUES (
        p_user_id, p_legal_name, p_trade_name, p_cnpj, p_bio,
        p_responsible_name, p_phone, p_email, p_address, p_city, p_state,
        p_latitude, p_longitude, p_services_offered, p_profile_image,
        p_logo_image, p_portfolio_images, p_pix_key, p_referral_code,
        p_referrer_id, 'approved', NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        status = 'approved',
        updated_at = NOW(),
        legal_name = EXCLUDED.legal_name,
        trade_name = EXCLUDED.trade_name,
        phone = EXCLUDED.phone,
        services_offered = EXCLUDED.services_offered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VERIFICAÇÃO FINAL
SELECT id, full_name, role FROM public.profiles WHERE id = 'fb81202f-dff9-4adf-9a4f-eacc1b31fd9d';
