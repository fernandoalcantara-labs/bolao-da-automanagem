-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.users               enable row level security;
alter table public.teams               enable row level security;
alter table public.players             enable row level security;
alter table public.matches             enable row level security;
alter table public.palpites_grupos     enable row level security;
alter table public.palpites_mata       enable row level security;
alter table public.palpites_artilheiro enable row level security;
alter table public.config              enable row level security;
alter table public.ranking_snapshots   enable row level security;

-- Helper: o usuário corrente é admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.users where id = auth.uid()),
    false
  );
$$;

-- Helper: deadline da fase de grupos passou?
create or replace function public.deadline_grupos_passou()
returns boolean
language sql
stable
as $$
  select now() >= timestamptz '2026-06-11 20:00:00-04:00';
$$;

-- =====================================================================
-- USERS  (público lê só nome, role, pago via view, mas RLS expõe colunas)
-- =====================================================================
drop policy if exists users_select_public on public.users;
create policy users_select_public on public.users
  for select using (true);

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.users where id = auth.uid()));

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (id = auth.uid());

-- =====================================================================
-- TEAMS / PLAYERS / MATCHES / CONFIG / RANKING — leitura pública
-- =====================================================================
drop policy if exists teams_select_all on public.teams;
create policy teams_select_all on public.teams for select using (true);
drop policy if exists teams_admin_write on public.teams;
create policy teams_admin_write on public.teams for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists players_select_all on public.players;
create policy players_select_all on public.players for select using (true);
drop policy if exists players_admin_write on public.players;
create policy players_admin_write on public.players for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists matches_select_all on public.matches;
create policy matches_select_all on public.matches for select using (true);
drop policy if exists matches_admin_write on public.matches;
create policy matches_admin_write on public.matches for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists config_select_all on public.config;
create policy config_select_all on public.config for select using (true);
drop policy if exists config_admin_write on public.config;
create policy config_admin_write on public.config for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ranking_select_all on public.ranking_snapshots;
create policy ranking_select_all on public.ranking_snapshots for select using (true);
drop policy if exists ranking_admin_write on public.ranking_snapshots;
create policy ranking_admin_write on public.ranking_snapshots for all
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- PALPITES — usuário lê/escreve os próprios; lê os de outros após deadline;
-- admin tem acesso total. Escrita bloqueada após o deadline.
-- =====================================================================
drop policy if exists palpites_grupos_select on public.palpites_grupos;
create policy palpites_grupos_select on public.palpites_grupos
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or public.deadline_grupos_passou()
  );

drop policy if exists palpites_grupos_insert on public.palpites_grupos;
create policy palpites_grupos_insert on public.palpites_grupos
  for insert with check (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  );

drop policy if exists palpites_grupos_update on public.palpites_grupos;
create policy palpites_grupos_update on public.palpites_grupos
  for update using (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  ) with check (user_id = auth.uid());

drop policy if exists palpites_grupos_admin on public.palpites_grupos;
create policy palpites_grupos_admin on public.palpites_grupos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists palpites_mata_select on public.palpites_mata;
create policy palpites_mata_select on public.palpites_mata
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or public.deadline_grupos_passou()
  );

drop policy if exists palpites_mata_insert on public.palpites_mata;
create policy palpites_mata_insert on public.palpites_mata
  for insert with check (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  );

drop policy if exists palpites_mata_update on public.palpites_mata;
create policy palpites_mata_update on public.palpites_mata
  for update using (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  ) with check (user_id = auth.uid());

drop policy if exists palpites_mata_delete on public.palpites_mata;
create policy palpites_mata_delete on public.palpites_mata
  for delete using (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  );

drop policy if exists palpites_mata_admin on public.palpites_mata;
create policy palpites_mata_admin on public.palpites_mata
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists palpites_artilheiro_select on public.palpites_artilheiro;
create policy palpites_artilheiro_select on public.palpites_artilheiro
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or public.deadline_grupos_passou()
  );

drop policy if exists palpites_artilheiro_insert on public.palpites_artilheiro;
create policy palpites_artilheiro_insert on public.palpites_artilheiro
  for insert with check (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  );

drop policy if exists palpites_artilheiro_update on public.palpites_artilheiro;
create policy palpites_artilheiro_update on public.palpites_artilheiro
  for update using (
    user_id = auth.uid() and not public.deadline_grupos_passou()
  ) with check (user_id = auth.uid());

drop policy if exists palpites_artilheiro_admin on public.palpites_artilheiro;
create policy palpites_artilheiro_admin on public.palpites_artilheiro
  for all using (public.is_admin()) with check (public.is_admin());
