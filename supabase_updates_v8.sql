-- ===============================================
-- LimpFlix Database Updates v8 - Corrigir Cadastro de Prestador
-- ===============================================
-- IMPORTANTE: Este arquivo resolve o problema do e-mail de confirmação.
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard > SQL Editor

-- 1. Permite que prestadores sejam inseridos mesmo sem e-mail confirmado
-- O campo email_confirmed_at pode ser NULL quando a confirmação está desabilitada.
-- A RLS atual já trata isso corretamente (auth.uid() = user_id).

-- 2. Garante que a função handle_new_user trata usuários sem e-mail confirmado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insere profile independente de confirmação de e-mail
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING; -- Evita duplicação se já existir
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Adiciona política para que prestadores possam inserir seus próprios dados
-- mesmo quando o e-mail ainda não foi confirmado (identidade já é válida pelo auth.uid())
DROP POLICY IF EXISTS "Anyone can register as provider" ON service_providers;
CREATE POLICY "Anyone can register as provider" ON service_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Verificação: lista prestadores cadastrados recentemente
-- SELECT id, legal_name, email, status, created_at 
-- FROM service_providers 
-- ORDER BY created_at DESC 
-- LIMIT 10;
