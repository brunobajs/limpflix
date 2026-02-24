-- ===============================================
-- LimpFlix Database Updates v12 - Robust New User Trigger
-- ===============================================

-- 1. Recriar a função handle_new_user para ser o mais simples possível
-- Isso garante que a conta 'auth.users' e o 'public.profiles' sempre existam.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário LimpFlix'),
    'provider' -- Forçamos role como provider para este fluxo de cadastro
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'provider';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Garantir que o trigger está associado corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Pequeno ajuste na tabela service_providers para garantir compatibilidade
-- Removemos e recriamos a FK apenas para garantir que o tipo e o alvo estão corretos
ALTER TABLE public.service_providers 
DROP CONSTRAINT IF EXISTS service_providers_user_id_fkey;

ALTER TABLE public.service_providers
ADD CONSTRAINT service_providers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
