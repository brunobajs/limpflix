-- ===============================================
-- LimpFlix Database Updates v26 - Financial & Split Fix
-- ===============================================

-- 1. Garantir colunas financeiras em service_bookings
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS amount_provider DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_platform DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_referral DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_paid_to_id UUID REFERENCES public.service_providers(id);

-- 2. Atualizar a função de Split (90/8/2)
CREATE OR REPLACE FUNCTION fn_process_booking_split()
RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL(10,2);
    v_provider_id UUID;
    v_client_id UUID;
    v_referrer_id UUID;
    v_provider_amt DECIMAL(10,2);
    v_platform_amt DECIMAL(10,2);
    v_referral_amt DECIMAL(10,2);
BEGIN
    -- Só processa se o status mudar para 'confirmed' (indica pagamento ou aprovação direta)
    IF (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') 
       OR (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
       
        v_total := NEW.total_amount;
        v_provider_id := NEW.provider_id;
        v_client_id := NEW.client_id;
        
        -- Cálculo: 90% Prestador
        v_provider_amt := v_total * 0.90;
        
        -- Indicações (2%)
        SELECT referred_by_provider_id INTO v_referrer_id FROM public.profiles WHERE id = v_client_id;
        IF v_referrer_id IS NULL THEN
            SELECT referrer_id INTO v_referrer_id FROM public.service_providers WHERE id = v_provider_id;
        END IF;

        IF v_referrer_id IS NOT NULL AND v_referrer_id != v_provider_id THEN
            v_referral_amt := v_total * 0.02;
            v_platform_amt := v_total * 0.08;
        ELSE
            v_referral_amt := 0;
            v_platform_amt := v_total * 0.10;
        END IF;

        -- Atribui ao registro
        NEW.amount_provider := v_provider_amt;
        NEW.amount_platform := v_platform_amt;
        NEW.amount_referral := v_referral_amt;
        NEW.referral_paid_to_id := v_referrer_id;

        -- ATUALIZAÇÃO DE CARTEIRAS
        -- 1. Prestador
        UPDATE public.service_providers 
        SET wallet_balance = COALESCE(wallet_balance, 0) + v_provider_amt 
        WHERE id = v_provider_id;

        -- 2. Registro Transação (Prestador)
        INSERT INTO public.financial_transactions (provider_id, booking_id, type, amount, status, description)
        VALUES (v_provider_id, NEW.id, 'incoming', v_provider_amt, 'completed', 'Recebimento de serviço (90%)');

        -- 3. Indicador
        IF v_referral_amt > 0 THEN
            UPDATE public.service_providers 
            SET wallet_balance = COALESCE(wallet_balance, 0) + v_referral_amt 
            WHERE id = v_referrer_id;

            INSERT INTO public.financial_transactions (provider_id, booking_id, type, amount, status, description)
            VALUES (v_referrer_id, NEW.id, 'incoming', v_referral_amt, 'completed', 'Comissão de indicação (2%)');
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir a Trigger
DROP TRIGGER IF EXISTS trg_process_booking_payment ON public.service_bookings;
CREATE TRIGGER trg_process_booking_payment
  BEFORE INSERT OR UPDATE ON public.service_bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_process_booking_split();
