-- ===============================================
-- LimpFlix Database Updates v11 - Criar Bucket de Mídia
-- ===============================================

-- 1. Criar o bucket 'providers-media' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('providers-media', 'providers-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Segurança para o Bucket
-- Importante: Isso permite que as imagens sejam enviadas durante o cadastro.

-- Permitir que qualquer pessoa veja as imagens (público)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'providers-media');

-- Permitir que usuários autenticados ou anônimos enviem imagens
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'providers-media');

-- Permitir que usuários deletem suas próprias imagens
DROP POLICY IF EXISTS "Allow delete" ON storage.objects;
CREATE POLICY "Allow delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'providers-media');
