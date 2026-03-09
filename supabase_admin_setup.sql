-- ===============================================
-- LIMPFLIX - CONFIGURAR USUÁRIO ADMIN
-- Execute este script para promover um usuário a admin.
-- ===============================================

-- 1. Ver todos os usuários e seus roles atuais
SELECT id, full_name, email, role, created_at
FROM public.profiles
ORDER BY created_at DESC;

-- 2. Promover um usuário específico a admin
-- Substitua 'SEU_EMAIL_AQUI' pelo e-mail do administrador.
-- Primeiro, descubra o UUID do usuário acima e use abaixo:

-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'COLE-AQUI-O-UUID-DO-ADMIN';

-- 3. (Opcional) Adicionar role 'admin' ao ENUM se necessário
-- A tabela profiles deve aceitar o valor 'admin' no campo role.
-- Se der erro de constraint, execute:

-- ALTER TABLE public.profiles
-- DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ALTER TABLE public.profiles
-- ADD CONSTRAINT profiles_role_check
-- CHECK (role IN ('client', 'provider', 'admin'));

-- 4. Verificar o resultado final
-- SELECT id, full_name, role FROM public.profiles WHERE role = 'admin';
