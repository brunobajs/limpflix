-- ===============================================
-- LimpFlix Database Updates v25 - Availability Toggle
-- ===============================================

-- 1. Adicionar coluna de disponibilidade
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS accepts_new_quotes BOOLEAN DEFAULT true;

-- 2. Atualizar RPC de busca Top 3 para respeitar a disponibilidade
CREATE OR REPLACE FUNCTION get_nearby_providers_top3(p_lat FLOAT, p_lng FLOAT, p_service_name TEXT)
RETURNS SETOF public.service_providers AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.service_providers
    WHERE status = 'approved' 
      AND is_busy = false
      AND accepts_new_quotes = true -- Regra de negócio: Apenas quem aceita novos orçamentos
      AND (p_service_name = ANY(services_offered) OR p_service_name = '')
    ORDER BY calculate_distance(p_lat, p_lng, latitude, longitude) ASC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;
