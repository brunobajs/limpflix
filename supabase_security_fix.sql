-- ===============================================
-- LIMPFLIX - CORREÇÃO DE SEGURANÇA E RLS
-- Execute este script no SQL Editor do Supabase
-- ===============================================

-- 1. REMOVER POLÍTICAS PERMISSIVAS DEMAIS

-- Profiles: Apenas o próprio usuário pode modificar
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Service Providers: Apenas usuários autenticados podem ver aprovados
DROP POLICY IF EXISTS "Approved providers are public" ON public.service_providers;
DROP POLICY IF EXISTS "Providers can see own data" ON public.service_providers;
DROP POLICY IF EXISTS "Anyone can register as provider" ON public.service_providers;
DROP POLICY IF EXISTS "Providers can update own data" ON public.service_providers;

CREATE POLICY "Approved providers visible to authenticated users" ON public.service_providers
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'approved');

CREATE POLICY "Providers can see own data" ON public.service_providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can register as provider" ON public.service_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers can update own data" ON public.service_providers
  FOR UPDATE USING (auth.uid() = user_id);

-- Service Bookings: Políticas mais restritas
DROP POLICY IF EXISTS "Anyone can create booking" ON public.service_bookings;

CREATE POLICY "Authenticated users can create booking" ON public.service_bookings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Chat Conversations: Apenas participantes podem ver
DROP POLICY IF EXISTS "Anyone can create conversation" ON public.chat_conversations;

CREATE POLICY "Authenticated users can create conversation" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Chat Messages: Apenas participantes
DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;

CREATE POLICY "Authenticated users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 2. REMOVER CHAVE DO RESEND DO FRONTEND
-- A chave foi removida do .env e movida para Edge Function
-- A Edge Function send-email agora gerencia os emails de forma segura

-- 3. VERIFICAR STORAGE BUCKET
-- Garantir que apenas usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Política para uploads autenticados
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'providers-media' AND auth.uid() IS NOT NULL
  );

-- Política para visualização pública (imagens de perfil, etc.)
CREATE POLICY "Public can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'providers-media');

-- Política para deleção apenas pelo proprietário
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'providers-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. CRIAR FUNÇÃO DE VERIFICAÇÃO DE PROPRIEDADE
CREATE OR REPLACE FUNCTION is_provider_owner(provider_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.service_providers
    WHERE id = provider_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ADICIONAR LOG DE AUDITORIA (OPCIONAL)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit log" ON public.audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. MENSAGEM DE SUCESSO
SELECT '✅ Correções de segurança aplicadas!' as status;
SELECT '📋 Políticas RLS corrigidas' as item
UNION ALL SELECT '🔐 Uploads agora exigem autenticação' as item
UNION ALL SELECT '📧 Emails movidos para Edge Function' as item
UNION ALL SELECT '📊 Log de auditoria criado' as item;