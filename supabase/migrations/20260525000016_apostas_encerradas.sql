-- =====================================================================
-- Item 50 — chave "apostas_encerradas" (freio manual de TODOS os palpites)
-- =====================================================================
-- Os palpites são gravados pelo CLIENT (supabase client), então o bloqueio
-- de verdade é via RLS. Adicionamos a chave de config + um helper SQL e
-- reforçamos as policies de INSERT/UPDATE/DELETE de palpites_grupos/mata/
-- artilheiro pra recusar quando: deadline passou OU apostas_encerradas=true.
-- Admin/recalc usam service_role (bypassam RLS) — não afetados.
-- Idempotente.

insert into public.config (chave, valor) values ('apostas_encerradas', 'false'::jsonb)
on conflict (chave) do nothing;

create or replace function public.apostas_encerradas()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select (valor = 'true'::jsonb) from public.config where chave = 'apostas_encerradas'),
    false
  );
$$;

-- Condição reutilizada: pode gravar palpite? (não passou deadline E não está encerrado)
-- Reescreve as policies de escrita adicionando `and not apostas_encerradas()`.

-- ───── palpites_grupos ─────
drop policy if exists palpites_grupos_insert on public.palpites_grupos;
create policy palpites_grupos_insert on public.palpites_grupos
  for insert with check (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  );

drop policy if exists palpites_grupos_update on public.palpites_grupos;
create policy palpites_grupos_update on public.palpites_grupos
  for update using (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  ) with check (user_id = auth.uid());

-- ───── palpites_mata ─────
drop policy if exists palpites_mata_insert on public.palpites_mata;
create policy palpites_mata_insert on public.palpites_mata
  for insert with check (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  );

drop policy if exists palpites_mata_update on public.palpites_mata;
create policy palpites_mata_update on public.palpites_mata
  for update using (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  ) with check (user_id = auth.uid());

drop policy if exists palpites_mata_delete on public.palpites_mata;
create policy palpites_mata_delete on public.palpites_mata
  for delete using (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  );

-- ───── palpites_artilheiro ─────
drop policy if exists palpites_artilheiro_insert on public.palpites_artilheiro;
create policy palpites_artilheiro_insert on public.palpites_artilheiro
  for insert with check (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  );

drop policy if exists palpites_artilheiro_update on public.palpites_artilheiro;
create policy palpites_artilheiro_update on public.palpites_artilheiro
  for update using (
    user_id = auth.uid()
    and not public.deadline_grupos_passou()
    and not public.apostas_encerradas()
  ) with check (user_id = auth.uid());
