-- =====================================================================
-- QW4 Item 22 — Tabela csv_backups pra guardar backups manuais e
-- automaticos do estado dos palpites.
-- =====================================================================

create table if not exists public.csv_backups (
  id serial primary key,
  tipo text not null check (tipo in ('manual_admin', 'deadline_grupos', 'fim_copa', 'outro')),
  gerado_em timestamptz not null default now(),
  gerado_por uuid references public.users(id) on delete set null,
  arquivo_nome text not null,
  conteudo_csv text not null,
  tamanho_bytes integer not null,
  total_usuarios integer,
  total_palpites integer
);

create index if not exists csv_backups_gerado_em_idx on public.csv_backups (gerado_em desc);
create index if not exists csv_backups_tipo_idx on public.csv_backups (tipo);

-- RLS: somente admin lê/escreve
alter table public.csv_backups enable row level security;

drop policy if exists csv_backups_admin_select on public.csv_backups;
create policy csv_backups_admin_select on public.csv_backups
  for select using (public.is_admin());

drop policy if exists csv_backups_admin_insert on public.csv_backups;
create policy csv_backups_admin_insert on public.csv_backups
  for insert with check (public.is_admin());

drop policy if exists csv_backups_admin_delete on public.csv_backups;
create policy csv_backups_admin_delete on public.csv_backups
  for delete using (public.is_admin());
