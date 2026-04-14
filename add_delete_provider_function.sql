
-- ===============================================
-- LIMPFLIX - FUNÇÃO PARA DELETAR PRESTADOR
-- Data: 2026-04-08
-- Lida com a exclusão de todos os dados relacionados
-- ===============================================

CREATE OR REPLACE FUNCTION public.delete_provider_v1(p_provider_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Obter o user_id antes de deletar o prestador
    SELECT user_id INTO v_user_id FROM public.service_providers WHERE id = p_provider_id;

    -- 2. Deletar agendamentos vinculados
    DELETE FROM public.service_bookings WHERE provider_id = p_provider_id;

    -- 3. Deletar orçamentos vinculados
    DELETE FROM public.service_quotes WHERE provider_id = p_provider_id;

    -- 4. Deletar conversas (as mensagens serão deletadas via CASCADE se configurado, senão deletamos manualmente)
    -- Deletar mensagens primeiro para garantir
    DELETE FROM public.chat_messages WHERE conversation_id IN (
        SELECT id FROM public.chat_conversations WHERE provider_id = p_provider_id
    );
    DELETE FROM public.chat_conversations WHERE provider_id = p_provider_id;

    -- 5. Deletar documentos de verificação
    DELETE FROM public.provider_verification_docs WHERE provider_id = p_provider_id;

    -- 6. Deletar o registro de prestador
    DELETE FROM public.service_providers WHERE id = p_provider_id;

    -- 7. Deletar o perfil (public.profiles)
    -- Nota: Isso não remove o usuário da tabela auth.users do Supabase, 
    -- mas remove o perfil público e torna o usuário inativo na plataforma.
    IF v_user_id IS NOT NULL THEN
        DELETE FROM public.profiles WHERE id = v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
