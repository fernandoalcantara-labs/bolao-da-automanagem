-- =====================================================================
-- Bolão da AutoManagem — Schema inicial
-- Copa do Mundo FIFA 2026 (48 seleções, 12 grupos de 4)
-- =====================================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- =====================================================================
-- USERS — perfil estendido vinculado a auth.users (1:1)
-- =====================================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  telefone text,
  role text not null default 'user' check (role in ('admin','user')),
  pago boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists users_pago_idx on public.users(pago);
create index if not exists users_role_idx on public.users(role);

-- =====================================================================
-- TEAMS — 48 seleções
-- =====================================================================
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  codigo_fifa text not null,     -- ISO-style: br, ar, fr…  (gb-eng, gb-sct)
  bandeira_url text not null,
  grupo char(1) not null check (grupo between 'A' and 'L'),
  tbd boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists teams_grupo_idx on public.teams(grupo);

-- =====================================================================
-- PLAYERS — jogadores candidatos a artilheiro
-- =====================================================================
create table if not exists public.players (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  time_id uuid references public.teams(id) on delete set null,
  gols_torneio integer not null default 0,
  created_at timestamptz not null default now(),
  unique (nome, time_id)
);

create index if not exists players_time_idx on public.players(time_id);
create index if not exists players_gols_idx on public.players(gols_torneio desc);

-- =====================================================================
-- MATCHES — 72 fase de grupos + mata-mata
-- =====================================================================
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  fase text not null check (fase in ('grupos','16avos','8avos','quartas','semi','3lugar','final')),
  rodada smallint,               -- 1,2,3 para fase de grupos; null nos demais
  grupo char(1),                 -- A-L para fase de grupos
  time_casa_id uuid references public.teams(id) on delete set null,
  time_fora_id uuid references public.teams(id) on delete set null,
  placar_casa smallint,
  placar_fora smallint,
  data_hora timestamptz not null,
  status text not null default 'agendado' check (status in ('agendado','andamento','finalizado')),
  api_match_id text,             -- id na football-data.org
  editado_manualmente boolean not null default false,
  ordem smallint,                -- usado para mata-mata (slot da chave)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists matches_fase_idx on public.matches(fase);
create index if not exists matches_status_idx on public.matches(status);
create index if not exists matches_data_idx on public.matches(data_hora);
create unique index if not exists matches_api_idx on public.matches(api_match_id)
  where api_match_id is not null;

-- =====================================================================
-- PALPITES — fase de grupos (placar exato)
-- =====================================================================
create table if not exists public.palpites_grupos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  placar_casa smallint not null check (placar_casa between 0 and 20),
  placar_fora smallint not null check (placar_fora between 0 and 20),
  pontos_calculados integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

create index if not exists palpites_grupos_user_idx on public.palpites_grupos(user_id);
create index if not exists palpites_grupos_match_idx on public.palpites_grupos(match_id);

-- =====================================================================
-- PALPITES — mata-mata (chuta quem PASSA até cada fase)
-- "fase" indica a fase para a qual o time AVANÇA
-- =====================================================================
create table if not exists public.palpites_mata (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  time_id uuid not null references public.teams(id) on delete cascade,
  fase text not null check (fase in ('16avos','8avos','quartas','semi','final','campeao')),
  acertou boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, time_id, fase)
);

create index if not exists palpites_mata_user_idx on public.palpites_mata(user_id);
create index if not exists palpites_mata_fase_idx on public.palpites_mata(fase);

-- =====================================================================
-- PALPITES — artilheiro
-- =====================================================================
create table if not exists public.palpites_artilheiro (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  player_id uuid not null references public.players(id),
  acertou boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- CONFIG — chave/valor para parâmetros editáveis
-- =====================================================================
create table if not exists public.config (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

-- Valores default
insert into public.config(chave, valor) values
  ('pontuacao', jsonb_build_object(
    'placar_exato', 5,
    'vencedor_ou_empate', 2,
    'mata_16avos', 8,
    'mata_8avos', 12,
    'mata_quartas', 16,
    'mata_semi', 20,
    'vice', 24,
    'campeao', 40,
    'artilheiro', 24
  )),
  ('rateio', jsonb_build_object(
    'primeiro', 60,
    'segundo', 20,
    'terceiro', 10,
    'artilheiro', 10
  )),
  ('pix_chave', to_jsonb('chave-pix-do-organizador@email.com'::text)),
  ('pix_nome', to_jsonb('Organizador do Bolão'::text)),
  ('valor_aposta', to_jsonb(50::int)),
  ('nome_bolao', to_jsonb('Bolão da AutoManagem'::text))
on conflict (chave) do nothing;

-- =====================================================================
-- RANKING_SNAPSHOTS — uma snapshot por usuário por rodada
-- Usada pelo gráfico multi-linhas
-- =====================================================================
create table if not exists public.ranking_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  rodada_label text not null,    -- "Grupos R1", "Grupos R2", "Grupos R3", "16 avos", "8 avos", "Quartas", "Semi", "Final"
  rodada_ordem smallint not null,
  posicao smallint not null,
  pontos_totais integer not null,
  pontos_rodada integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, rodada_ordem)
);

create index if not exists ranking_snapshots_ordem_idx on public.ranking_snapshots(rodada_ordem);
create index if not exists ranking_snapshots_user_idx on public.ranking_snapshots(user_id);

-- =====================================================================
-- Trigger de updated_at
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_matches_updated on public.matches;
create trigger trg_matches_updated before update on public.matches
  for each row execute function public.set_updated_at();

drop trigger if exists trg_palpites_grupos_updated on public.palpites_grupos;
create trigger trg_palpites_grupos_updated before update on public.palpites_grupos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_palpites_mata_updated on public.palpites_mata;
create trigger trg_palpites_mata_updated before update on public.palpites_mata
  for each row execute function public.set_updated_at();

drop trigger if exists trg_palpites_artilheiro_updated on public.palpites_artilheiro;
create trigger trg_palpites_artilheiro_updated before update on public.palpites_artilheiro
  for each row execute function public.set_updated_at();

drop trigger if exists trg_config_updated on public.config;
create trigger trg_config_updated before update on public.config
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Função helper: cria perfil em public.users no signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nome, email, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
