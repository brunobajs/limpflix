-- Table to track all financial movements
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES service_providers(id),
  booking_id UUID REFERENCES service_bookings(id),
  type TEXT NOT NULL, -- 'incoming' (payment), 'payout' (withdrawal), 'platform_fee'
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  description TEXT,
  pix_key TEXT, -- For payouts
  mp_payment_id TEXT, -- Mercado Pago Payment ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for history
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON financial_transactions(provider_id);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can see own transactions" ON financial_transactions
  FOR SELECT USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );
