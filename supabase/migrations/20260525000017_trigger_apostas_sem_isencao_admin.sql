-- =====================================================================
-- Apostas encerradas — remover a isenção de ADMIN do trigger
-- =====================================================================
-- Contexto: a 1ª versão (20260525000016) isentava `service_role` E `is_admin()`.
-- Efeito colateral: o admin, que TAMBÉM é jogador, conseguia mexer nos próprios
-- palpites mesmo com as apostas encerradas (burlava o freio).
--
-- Decisão: o trigger passa a isentar SÓ `service_role`. As operações legítimas
-- do admin que precisam rodar após o prazo/encerramento (recálculo e validação
-- de artilheiro) já rodam via service_role:
--   • /api/recalcular  → recalcularTudo(createAdminClient())
--   • /api/sync-matches (cron) → idem
--   • validação de artilheiro → AGORA via server action setArtilheiroAcertou()
--     (admin/artilheiros/actions.ts) que usa createAdminClient()
-- Assim o admin-jogador é barrado como todo mundo, sem quebrar nada do admin.
--
-- Só redefine a função (CREATE OR REPLACE); os 3 triggers continuam apontando
-- pra ela. Idempotente.

create or replace function public.bloquear_palpite_se_encerrado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_override boolean;
  v_encerradas boolean;
begin
  -- SÓ service_role é isento (recalc/cron/scripts + validação admin via
  -- server action). O admin NÃO é mais isento aqui — também é jogador.
  if coalesce(auth.role(), '') = 'service_role' then
    return coalesce(new, old);
  end if;

  v_override   := coalesce((select valor = 'true'::jsonb from public.config where chave = 'apostas_override'), false);
  v_encerradas := coalesce((select valor = 'true'::jsonb from public.config where chave = 'apostas_encerradas'), false);

  if v_override then
    -- Controle manual: a chave manda (independe do prazo)
    if v_encerradas then
      raise exception 'Apostas encerradas pelo admin.' using errcode = 'check_violation';
    end if;
  else
    -- Automático: segue o prazo (= DEADLINE_FASE_GRUPOS do app)
    if now() >= timestamptz '2026-06-11 16:00:00-03' then
      raise exception 'Prazo de palpites encerrado.' using errcode = 'check_violation';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;
