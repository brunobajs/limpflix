-- ===============================================
-- LimpFlix Database Updates v24 - Business Rules (REVISADO)
-- Nolificações, Top 3, Match Automático & Agenda
-- ===============================================

-- 1. Garantir colunas na tabela quote_requests (se houver divergência)
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS selected_provider_ids UUID[],
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT;

-- 2. Função Haversine para cálculo de distância
CREATE OR REPLACE FUNCTION calculate_distance(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT)
RETURNS FLOAT AS $$
DECLARE
    R FLOAT := 6371; -- Raio da Terra em km
    dlat FLOAT;
    dlon FLOAT;
    a FLOAT;
    c FLOAT;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := (sin(dlat / 2) * sin(dlat / 2)) + (cos(radians(lat1)) * cos(radians(lat2)) * (sin(dlon / 2) * sin(dlon / 2)));
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. RPC para buscar os 3 prestadores mais próximos e ativos
CREATE OR REPLACE FUNCTION get_nearby_providers_top3(p_lat FLOAT, p_lng FLOAT, p_service_name TEXT)
RETURNS SETOF public.service_providers AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.service_providers
    WHERE status = 'approved' 
      AND is_busy = false
      AND (p_service_name = ANY(services_offered) OR p_service_name = '')
    ORDER BY calculate_distance(p_lat, p_lng, latitude, longitude) ASC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- 4. Status de Orçamento: Auto-rejeição
CREATE OR REPLACE FUNCTION fn_on_quote_approved()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudar para 'accepted' ou 'paid'
    IF (OLD.status NOT IN ('paid', 'accepted') AND NEW.status IN ('paid', 'accepted')) THEN
        
        -- Marcar os outros orçamentos da mesma conversa ou do mesmo request como reprovados
        UPDATE public.service_quotes
        SET status = 'rejected_by_other',
            updated_at = NOW()
        WHERE conversation_id = NEW.conversation_id
          AND id != NEW.id
          AND status IN ('pending', 'sent');

        -- Se houver vínculo com quote_request_id na conversa, rejeitar outros orçamentos desse request
        UPDATE public.service_quotes q
        SET status = 'rejected_by_other',
            updated_at = NOW()
        FROM public.chat_conversations c
        WHERE q.conversation_id = c.id
          AND c.quote_request_id = (SELECT quote_request_id FROM public.chat_conversations WHERE id = NEW.conversation_id)
          AND q.id != NEW.id
          AND q.status IN ('pending', 'sent');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_quote_approved ON public.service_quotes;
CREATE TRIGGER trg_on_quote_approved
    AFTER UPDATE ON public.service_quotes
    FOR EACH ROW
    EXECUTE FUNCTION fn_on_quote_approved();

-- 5. Automação de Agenda
CREATE OR REPLACE FUNCTION fn_ensure_booking_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status NOT IN ('paid', 'accepted') AND NEW.status IN ('paid', 'accepted')) THEN
        IF NOT EXISTS (SELECT 1 FROM service_bookings WHERE quote_id = NEW.id) THEN
            INSERT INTO service_bookings (
                provider_id, client_id, service_name, total_amount, 
                status, payment_status, quote_id, scheduled_date, scheduled_time
            ) VALUES (
                NEW.provider_id, NEW.client_id, NEW.service_name, NEW.amount,
                'confirmed', 
                CASE WHEN NEW.status = 'paid' THEN 'paid' ELSE 'pending' END,
                NEW.id, 
                COALESCE(NEW.scheduled_date, CURRENT_DATE), 
                COALESCE(NEW.scheduled_time, '09:00')
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_booking ON public.service_quotes;
CREATE TRIGGER trg_ensure_booking
    AFTER UPDATE ON public.service_quotes
    FOR EACH ROW
    EXECUTE FUNCTION fn_ensure_booking_on_approval();
