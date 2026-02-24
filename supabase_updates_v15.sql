-- ===============================================
-- LimpFlix Database Updates v15 - Diagnóstico e Teste Radical
-- ===============================================

-- 1. Função de diagnóstico para ver no console do navegador se o usuário existe no banco
CREATE OR REPLACE FUNCTION public.check_user_exists(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Teste Radical: Remover a obrigatoriedade da chave estrangeira temporariamente
-- Isso vai permitir o cadastro se o problema for apenas a ligação com auth.users.
-- Se funcionar, poderemos ver na tabela qual ID foi gerado e comparar.

ALTER TABLE public.service_providers 
DROP CONSTRAINT IF EXISTS service_providers_user_id_fkey;

-- Deixamos sem a constraint para esse teste.
-- Depois que descobrirmos o motivo, re-adicionaremos corretamente.
