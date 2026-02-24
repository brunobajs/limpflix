-- ===============================================
-- LimpFlix Database Updates v14 - Limpeza de Constraints e Robustez
-- ===============================================

-- 1. Remover TODAS as constraints de chave estrangeira que possam estar travando o user_id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'service_providers' AND column_name = 'user_id'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.service_providers DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 2. Re-adicionar a constraint correta apontando para auth.users
ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Garantir que a tabela profiles também está limpa
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'profiles' AND column_name = 'id'
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Atualizar o trigger de criação de usuário para ser ultra-seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Se já existir um perfil, apenas atualiza
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    UPDATE public.profiles 
    SET full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
        role = 'provider'
    WHERE id = NEW.id;
  ELSE
    -- Se não existir, insere
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário LimpFlix'),
      'provider'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de qualquer erro no trigger, ainda assim retorna o NEW para não quebrar o cadastro no auth.users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
