-- =====================================================================
-- Itens 49/50 — Bloqueio de palpites: modelo "B2" (automático + override)
-- =====================================================================
-- REESCRITO pós-teste na VPC. A 1ª versão usava só RLS com apostas_encerradas;
-- mas (a) os palpites são gravados pelo CLIENT, e o erro genérico de RLS não
-- dá pra detectar no form pra travar a UI sem reload; e (b) o mata faz
-- delete+insert — sem cobrir DELETE, encerrar apagaria os picks sem reinserir.
--
-- Solução: um TRIGGER que levanta exceção com MENSAGEM RECONHECÍVEL (o form
-- detecta e trava sem reload), cobrindo INSERT/UPDATE/DELETE. Modelo B2:
--   • apostas_override = false  → AUTOMÁTICO: segue o prazo (DEADLINE).
--   • apostas_override = true   → MANUAL: apostas_encerradas manda (pode até
--                                  reabrir antes/depois do prazo).
-- service_role (recalc/scripts) e admin (is_admin) NUNCA são bloqueados.
-- As policies de escrita viram OWNERSHIP-only (o trigger é o porteiro do
-- tempo) pra o override conseguir reabrir mesmo após o prazo.
-- Idempotente.

-- ───── Config (2 chaves) ─────
insert into public.config (chave, valor) values ('apostas_encerradas', 'false'::jsonb)
  on conflict (chave) do nothing;
insert into public.config (chave, valor) values ('apostas_override', 'false'::jsonb)
  on conflict (chave) do nothing;

-- ───── Função do trigger (B2) ─────
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
  -- recalc/scripts (service_role) e admin nunca são bloqueados
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
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

-- ───── Triggers (INSERT/UPDATE/DELETE) ─────
drop trigger if exists trg_bloquear_palpite_grupos on public.palpites_grupos;
create trigger trg_bloquear_palpite_grupos
  before insert or update or delete on public.palpites_grupos
  for each row execute function public.bloquear_palpite_se_encerrado();

drop trigger if exists trg_bloquear_palpite_mata on public.palpites_mata;
create trigger trg_bloquear_palpite_mata
  before insert or update or delete on public.palpites_mata
  for each row execute function public.bloquear_palpite_se_encerrado();

drop trigger if exists trg_bloquear_palpite_artilheiro on public.palpites_artilheiro;
create trigger trg_bloquear_palpite_artilheiro
  before insert or update or delete on public.palpites_artilheiro
  for each row execute function public.bloquear_palpite_se_encerrado();

-- ───── Policies de escrita = OWNERSHIP-only (o trigger cuida do tempo) ─────
-- O prazo SAI das policies de escrita: senão o RLS bloquearia após o prazo
-- mesmo com override reabrindo. SELECT e as policies _admin ficam intactas.
drop policy if exists palpites_grupos_insert on public.palpites_grupos;
create policy palpites_grupos_insert on public.palpites_grupos
  for insert with check (user_id = auth.uid());
drop policy if exists palpites_grupos_update on public.palpites_grupos;
create policy palpites_grupos_update on public.palpites_grupos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists palpites_mata_insert on public.palpites_mata;
create policy palpites_mata_insert on public.palpites_mata
  for insert with check (user_id = auth.uid());
drop policy if exists palpites_mata_update on public.palpites_mata;
create policy palpites_mata_update on public.palpites_mata
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists palpites_mata_delete on public.palpites_mata;
create policy palpites_mata_delete on public.palpites_mata
  for delete using (user_id = auth.uid());

drop policy if exists palpites_artilheiro_insert on public.palpites_artilheiro;
create policy palpites_artilheiro_insert on public.palpites_artilheiro
  for insert with check (user_id = auth.uid());
drop policy if exists palpites_artilheiro_update on public.palpites_artilheiro;
create policy palpites_artilheiro_update on public.palpites_artilheiro
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Limpa a função da 1ª versão (se algum ambiente chegou a aplicá-la)
drop function if exists public.apostas_encerradas();
