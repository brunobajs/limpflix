-- ===============================================
-- LIMPFLIX - MEGA FIX AUTH E REGISTRO DE CLIENTES (v19)
-- Garante que as colunas existem antes de compilar a função.
-- ===============================================

-- 1. GARANTE QUE A COLUNA EXISTE (Sem isso, o script anterior pode ter falhado ao rodar)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID REFERENCES public.service_providers(id);

-- 2. FUNÇÃO HANDLE_NEW_USER 100% À PROVA DE FALHAS
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
        RAISE WARNING 'Erro ao criar perfil no handle_new_user para %', NEW.id;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECRIA O TRIGGER SÓ PARA GARANTIR
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
