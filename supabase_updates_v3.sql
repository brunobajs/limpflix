-- Add Mercado Pago Account ID to service providers to allow splitting
ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS mercadopago_account_id TEXT;

-- Add Booking ID and preference details to quote requests if needed
-- (Usually managed in service_bookings, but let's ensure we have everything)

COMMENT ON COLUMN service_providers.mercadopago_account_id IS 'ID da conta vinculada do Mercado Pago para recebimento de split';
