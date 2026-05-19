-- =====================================================================
-- QW3 Item 15 — Limpar duplicatas de jogadores
--
-- Bug: tabela players acumulou duplicatas (variações de case, acentos,
-- espaços) que passaram pela constraint unique(nome, time_id) existente
-- — ela é case+accent-sensitive, então "Vinicius Junior" e "Vinícius
-- Júnior" eram considerados distintos.
--
-- Estratégia:
--  1) Habilita extensão unaccent pra normalizar
--  2) Identifica grupo canônico por (lower(unaccent(trim(nome))), time_id)
--  3) Mantém o jogador com MENOR created_at (primeiro cadastrado) — em
--     empate, MENOR id pra ser determinístico
--  4) Migra palpites_artilheiro das duplicatas pro canônico (sem perder
--     palpites)
--  5) DELETE das duplicatas
--  6) Cria índice unique funcional pra prevenir duplicatas futuras
-- =====================================================================

create extension if not exists unaccent;

-- 1) Mapeamento duplicado -> canônico
--    Canônico = entrada mais antiga (menor created_at, depois menor id)
with grupos as (
  select
    id,
    lower(unaccent(trim(nome))) as nome_norm,
    time_id,
    created_at
  from public.players
),
canonicos as (
  select distinct on (nome_norm, time_id)
    id as id_canonico,
    nome_norm,
    time_id
  from grupos
  order by nome_norm, time_id, created_at asc, id asc
),
mapeamento as (
  select
    g.id as id_duplicado,
    c.id_canonico
  from grupos g
  join canonicos c
    on c.nome_norm = g.nome_norm
    and (c.time_id is not distinct from g.time_id)
  where g.id <> c.id_canonico
)
-- 2) Migra palpites_artilheiro pro canônico
update public.palpites_artilheiro pa
set player_id = m.id_canonico
from mapeamento m
where pa.player_id = m.id_duplicado;

-- 3) Soma gols_torneio dos duplicados no canônico antes de apagar
--    (caso a API tenha gravado gols só num dos registros)
with grupos as (
  select
    id,
    lower(unaccent(trim(nome))) as nome_norm,
    time_id,
    created_at,
    gols_torneio
  from public.players
),
canonicos as (
  select distinct on (nome_norm, time_id)
    id as id_canonico,
    nome_norm,
    time_id
  from grupos
  order by nome_norm, time_id, created_at asc, id asc
),
gols_max_por_grupo as (
  -- Pega o MAIOR gols_torneio dentro do grupo de duplicatas (não soma —
  -- duplicatas geralmente refletem o mesmo jogador, então max evita
  -- inflar o gol)
  select
    c.id_canonico,
    max(g.gols_torneio) as gols_max
  from grupos g
  join canonicos c
    on c.nome_norm = g.nome_norm
    and (c.time_id is not distinct from g.time_id)
  group by c.id_canonico
)
update public.players p
set gols_torneio = gm.gols_max
from gols_max_por_grupo gm
where p.id = gm.id_canonico
  and p.gols_torneio < gm.gols_max;

-- 4) Apaga duplicatas
with grupos as (
  select
    id,
    lower(unaccent(trim(nome))) as nome_norm,
    time_id,
    created_at
  from public.players
),
canonicos as (
  select distinct on (nome_norm, time_id)
    id as id_canonico,
    nome_norm,
    time_id
  from grupos
  order by nome_norm, time_id, created_at asc, id asc
)
delete from public.players p
using grupos g, canonicos c
where p.id = g.id
  and c.nome_norm = g.nome_norm
  and (c.time_id is not distinct from g.time_id)
  and p.id <> c.id_canonico;

-- 5) Constraint unique funcional pra prevenir duplicatas futuras.
--    A unique(nome, time_id) original continua existindo — esse índice
--    é uma camada extra que pega variações de case/acentos.
--    Não dá pra usar unique constraint funcional direto no Postgres,
--    então usamos índice único.
create unique index if not exists players_nome_norm_time_unique
  on public.players (lower(unaccent(trim(nome))), time_id)
  where time_id is not null;

-- Caso time_id seja null (jogador sem clube ainda), trata separado
create unique index if not exists players_nome_norm_null_team_unique
  on public.players (lower(unaccent(trim(nome))))
  where time_id is null;
