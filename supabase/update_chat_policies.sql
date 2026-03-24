-- Política para permitir UPDATE em chat_conversations
-- Permite que o cliente ou o prestador atualizem as flags de exclusão
DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;

CREATE POLICY "Users can update own conversations" ON public.chat_conversations
  FOR UPDATE
  USING (
    client_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id = auth.uid() OR 
    provider_id IN (SELECT id FROM public.service_providers WHERE user_id = auth.uid())
  );
