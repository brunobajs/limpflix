-- ===============================================
-- LimpFlix Database Updates v5
-- ===============================================

-- 1. Adiciona timestamps para o ciclo de vida do serviço
ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Garante que existem políticas para o Administrador (opcional, se não houver)
-- O admin poderá ver tudo através de políticas de RLS ou acesso direto se as políticas permitirem por 'role'

-- 3. Adiciona um campo de 'favoritos' (futuro, útil para marketing)
ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
