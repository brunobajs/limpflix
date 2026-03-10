-- Função para gerar código numérico de 5 dígitos único
CREATE OR REPLACE FUNCTION fn_generate_unique_5_digit_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Gera número entre 10000 e 99999
        v_code := floor(random() * 90000 + 10000)::TEXT;
        
        -- Verifica se já existe na tabela de prestadores
        SELECT EXISTS (
            SELECT 1 FROM service_providers WHERE referral_code = v_code
        ) INTO v_exists;
        
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

DROP TRIGGER IF EXISTS tr_ensure_referral_code ON service_providers;
CREATE TRIGGER tr_ensure_referral_code
BEFORE INSERT ON service_providers
FOR EACH ROW
EXECUTE FUNCTION tr_ensure_referral_code_fn();

-- Função RPC para validar código e retornar o ID do prestador (referrer_id)
CREATE OR REPLACE FUNCTION get_provider_id_by_code(p_code TEXT)
RETURNS UUID AS $$
DECLARE
    v_provider_id UUID;
BEGIN
    SELECT id INTO v_provider_id
    FROM service_providers
    WHERE referral_code = p_code
    LIMIT 1;
    
    RETURN v_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar campo de indicação na tabela de perfis (para clientes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID REFERENCES public.service_providers(id);

-- Atualizar o trigger de novo usuário para processar indicação via metadata
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

-- Atualizar prestadores existentes que não tem código ou tem código antigo
-- Isso garante que todos os atuais migrem para o formato novo de 5 dígitos
UPDATE service_providers 
SET referral_code = fn_generate_unique_5_digit_code()
WHERE referral_code IS NULL OR referral_code = '' OR referral_code LIKE 'LIMP%';
