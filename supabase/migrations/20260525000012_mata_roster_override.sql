-- =====================================================================
-- PARTE 2 — Admin do mata-mata por ROSTER (override manual por fase)
-- =====================================================================
-- Guarda, por (fase, time_id), se o admin forçou INCLUIR ou EXCLUIR um time
-- naquela fase do mata-mata. O roster "efetivo" de cada fase é calculado
-- combinando a base automática (só nos 16avos, vinda da classificação real
-- dos grupos) com estes overrides. Overrides sobrevivem ao recálculo
-- automático ("cadeado").
--
-- time_id é UUID (teams.id é uuid no schema). is_admin() já existe
-- (migration 20260515000002).

create table if not exists public.mata_roster_override (
  id uuid primary key default gen_random_uuid(),
  fase text not null check (fase in ('16avos','8avos','quartas','semi','final','campeao')),
  time_id uuid not null references public.teams(id) on delete cascade,
  incluir boolean not null,             -- true = forçar incluir; false = forçar excluir
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fase, time_id)
);

alter table public.mata_roster_override enable row level security;

-- Leitura: liberada (o scoring/admin lê o roster).
drop policy if exists mata_roster_override_select on public.mata_roster_override;
create policy mata_roster_override_select
  on public.mata_roster_override for select
  using (true);

-- Escrita: só admin (usa o helper is_admin() já existente).
drop policy if exists mata_roster_override_admin_write on public.mata_roster_override;
create policy mata_roster_override_admin_write
  on public.mata_roster_override for all
  using (public.is_admin()) with check (public.is_admin());
