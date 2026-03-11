-- ===============================================
-- LIMPFLIX - CLIENT REGISTRATION FIX (v18)
-- Torna o trigger de criação de usuário à prova de falhas na tabela profiles.
-- Se houver código de indicação, tenta vincular. Se não conseguir, ainda assim cria o perfil.
-- Se a criação do perfil falhar, o usuário do Auth ainda será criado.
-- ===============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID := NULL;
    v_code TEXT;
BEGIN
    -- 1. Tentar buscar o código de indicação com segurança
    BEGIN
        v_code := NEW.raw_user_meta_data->>'referred_by_code';
        IF v_code IS NOT NULL AND v_code != '' THEN
            SELECT id INTO v_referrer_id 
            FROM public.service_providers 
            WHERE referral_code = v_code 
            LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignora erros na busca da indicação
        v_referrer_id := NULL;
    END;

    -- 2. Inserir ou atualizar o perfil
    BEGIN
        INSERT INTO public.profiles (id, full_name, role, referred_by_provider_id)
        VALUES (
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário LimpFlix'), 
            'client',
            v_referrer_id
        )
        ON CONFLICT (id) DO UPDATE SET 
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            referred_by_provider_id = COALESCE(EXCLUDED.referred_by_provider_id, profiles.referred_by_provider_id);
    EXCEPTION WHEN OTHERS THEN
        -- Apenas loga o erro mas NÃO impede a criação do usuário no Auth.
        -- O usuário poderá preencher o perfil depois se necessário.
        RAISE WARNING 'Erro ao criar perfil no handle_new_user para %', NEW.id;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
