-- ===============================================
-- LIMPFLIX - V23 - FIX PARA EXCLUSÃO PRIVADA DE CHAT
-- Adiciona colunas para soft-delete individual
-- ===============================================

ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS deleted_by_client BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_by_provider BOOLEAN DEFAULT FALSE;

-- Garante que o status 'closed' existe ou é aceito (para o botão Desistir)
-- Como a coluna é TEXT, não precisa de ALTER TYPE se não houver CHECK constraint restrita.
-- Mas vamos garantir que o status padrão seja 'active'.
UPDATE public.chat_conversations SET status = 'active' WHERE status IS NULL;
