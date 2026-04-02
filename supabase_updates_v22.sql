-- ===============================================
-- LimpFlix Database Updates v22 - Notificações
-- ===============================================

-- Adiciona a coluna is_read na tabela de mensagens do chat
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
