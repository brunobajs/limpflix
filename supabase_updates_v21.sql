-- ===============================================
-- LimpFlix Database Updates v21 - Fix Payment Webhook
-- ===============================================

-- Adiciona a coluna external_payment_id para o Webhook do Mercado Pago não quebrar
ALTER TABLE public.service_bookings
ADD COLUMN IF NOT EXISTS external_payment_id TEXT;
