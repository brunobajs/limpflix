-- Cleanup obsolete columns from previous iterations
ALTER TABLE service_providers
DROP COLUMN IF EXISTS mercadopago_account_id;

-- Ensure pix_key is present and indexed for payouts
CREATE INDEX IF NOT EXISTS idx_providers_pix_key ON service_providers(pix_key);

COMMENT ON COLUMN service_providers.pix_key IS 'Chave Pix única do profissional para repasses automáticos (Payout)';
