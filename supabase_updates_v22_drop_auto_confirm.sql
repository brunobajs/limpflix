-- ===============================================
-- LIMPFLIX - V22 - REMOÇÃO DO AUTO CONFIRM USER (QUEBRADO)
-- Por favor, rode este script no SQL Editor do Supabase.
-- ===============================================

-- 1. O erro ocorre porque "confirmed_at" não pode ser sobrescrito pelo Supabase em versões recentes 
-- da tabela auth.users. A solução correta é deletar a trigger que tenta fazer isso.

DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_user();
