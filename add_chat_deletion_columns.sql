-- Opencode installation command (kept for reference)
-- npm i -g opencode-ai

-- Adicionar colunas de exclusão de chat
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS deleted_by_client BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by_provider BOOLEAN DEFAULT false;

-- Habilitar replicação em tempo real para o chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
