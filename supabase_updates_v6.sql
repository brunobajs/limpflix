-- ===============================================
-- LimpFlix Database Updates v6
-- ===============================================

-- 1. Vincular clientes a prestadores (Referência de Cliente)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS referred_by_provider_id UUID REFERENCES service_providers(id);

-- 2. Adicionar campo para rastrear comissão de indicação individual nos agendamentos
ALTER TABLE service_bookings
  ADD COLUMN IF NOT EXISTS referral_commission_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_paid_to_id UUID REFERENCES service_providers(id);

-- 3. Atualizar a visualização de lucro (valor total - taxa - comissão indicação)
-- Nota: Isso é apenas descritivo, a lógica de cálculo real deve estar nos componentes ou Edge Functions

-- 4. Função para vincular cliente ao prestador via código de indicação
CREATE OR REPLACE FUNCTION link_client_to_referrer(client_id UUID, referral_code TEXT)
RETURNS VOID AS $$
DECLARE
    referrer_id UUID;
BEGIN
    SELECT id INTO referrer_id FROM service_providers WHERE referral_code = referral_code LIMIT 1;
    
    IF referrer_id IS NOT NULL THEN
        UPDATE profiles SET referred_by_provider_id = referrer_id WHERE id = client_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
