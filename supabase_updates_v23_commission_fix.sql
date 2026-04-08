-- ===============================================
-- LimpFlix Database Updates v23 - 90/8/2 Split Fix
-- Sincroniza com as Edge Functions (90% Prestador, 2% Indicação)
-- ===============================================

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
    -- Só processa se o status mudar para 'confirmed' (pagamento aprovado)
    IF (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') 
       OR (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
       
        v_total := NEW.total_amount;
        v_provider_id := NEW.provider_id;
        v_client_id := NEW.client_id;
        
        -- Cálculo fixo de 90% para o prestador (Sincronizado com Webhook)
        v_provider_amt := v_total * 0.90;
        
        -- Busca o indicador (Prioridade: 1. Quem indicou o cliente, 2. Quem indicou o prestador)
        SELECT referred_by_provider_id INTO v_referrer_id FROM profiles WHERE id = v_client_id;
        
        IF v_referrer_id IS NULL THEN
            SELECT referrer_id INTO v_referrer_id FROM service_providers WHERE id = v_provider_id;
        END IF;

        -- Se houver indicador e não for o próprio prestador do serviço
        IF v_referrer_id IS NOT NULL AND v_referrer_id != v_provider_id THEN
            v_referral_amt := v_total * 0.02; -- 2% de indicação
            v_platform_amt := v_total * 0.08; -- 8% base para plataforma (Total 10% de taxa)
        ELSE
            v_referral_amt := 0;
            v_platform_amt := v_total * 0.10; -- 10% total para a plataforma se não houver indicação
        END IF;

        -- Atualiza o registro do booking com os valores calculados
        -- Nota: Garantir que estas colunas existem na tabela service_bookings
        NEW.amount_provider := v_provider_amt;
        NEW.amount_platform := v_platform_amt;
        NEW.amount_referral := v_referral_amt;
        NEW.referral_paid_to_id := v_referrer_id;

        -- --- ATUALIZAÇÃO DE CARTEIRAS ---

        -- 1. Crédito do Prestador
        UPDATE service_providers 
        SET wallet_balance = COALESCE(wallet_balance, 0) + v_provider_amt 
        WHERE id = v_provider_id;

        -- 2. Registro de Transação (Prestador)
        INSERT INTO financial_transactions (provider_id, booking_id, type, amount, status, description)
        VALUES (v_provider_id, NEW.id, 'incoming', v_provider_amt, 'completed', 'Recebimento de serviço (90%)');

        -- 3. Crédito do Indicador (se existir)
        IF v_referral_amt > 0 THEN
            UPDATE service_providers 
            SET wallet_balance = COALESCE(wallet_balance, 0) + v_referral_amt 
            WHERE id = v_referrer_id;

            INSERT INTO financial_transactions (provider_id, booking_id, type, amount, status, description)
            VALUES (v_referrer_id, NEW.id, 'incoming', v_referral_amt, 'completed', 'Comissão de indicação (2%)');
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
