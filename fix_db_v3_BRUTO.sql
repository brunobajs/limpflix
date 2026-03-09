-- 1. LIMPEZA E GARANTIA DE ESTRUTURA
ALTER TABLE public.service_providers 
DROP CONSTRAINT IF EXISTS service_providers_user_id_key;

ALTER TABLE public.service_providers 
ADD CONSTRAINT service_providers_user_id_key UNIQUE (user_id);

-- 2. CRIAÇÃO MANUAL DO PERFIL (FORÇADA)
-- Esse comando garante que o perfil exista na tabela public.profiles
-- mesmo que o trigger do Auth tenha falhado.
INSERT INTO public.profiles (id, full_name, role, updated_at)
VALUES (
  'fb81202f-dff9-4adf-9a4f-eacc1b31fd9d', 
  'BRUNO RODRIGUES', 
  'provider',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET 
  role = 'provider',
  updated_at = NOW();

-- 3. VERIFICAÇÃO (RODE ESTES SELECTS PARA CONFIRMAR)
SELECT * FROM public.profiles WHERE id = 'fb81202f-dff9-4adf-9a4f-eacc1b31fd9d';
SELECT * FROM public.service_providers WHERE user_id = 'fb81202f-dff9-4adf-9a4f-eacc1b31fd9d';

-- 4. ATUALIZAÇÃO DA FUNÇÃO PARA SER "ANTI-ERRO"
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

    -- Parte 2: Prestador
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
        trade_name = EXCLUDED.trade_name,
        phone = EXCLUDED.phone,
        services_offered = EXCLUDED.services_offered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
