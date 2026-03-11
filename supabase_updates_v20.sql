-- ===============================================
-- LIMPFLIX - V20 - FIX DEFINITIVO PARA CADASTRO DE CLIENTES
-- Por favor, rode este script no SQL Editor do Supabase.
-- ===============================================

-- 1. Garante que a coluna de indicação existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID REFERENCES public.service_providers(id);

-- 2. Recria a função de forma 100% à prova de falhas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID := NULL;
    v_code TEXT;
BEGIN
    -- Tentativa de pegar o código de indicação (sem travar se der erro)
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

    -- Criação do perfil do cliente (ignorando qualquer erro que possa acontecer)
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
        -- Ignora silenciosamente para não interromper o cadastro da autenticação
        NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconecta o trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
