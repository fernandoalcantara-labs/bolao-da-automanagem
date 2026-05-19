-- =====================================================================
-- QW3 Item 15 — Cleanup adicional: jogadores duplicados por (nome, time_id null vs preenchido)
--
-- Bug encontrado pelo Fernando ao testar CT-15:
-- Após rodar a migration 20260520000006, ainda existiam pares de
-- jogadores com mesmo nome normalizado mas time_id divergente — um
-- com NULL (seed antigo, antes da seleção ser definida) e outro com
-- a seleção preenchida. A constraint unique funcional só pegava
-- duplicatas com MESMO time_id, então esses pares passaram.
--
-- Exemplos encontrados (10 pares): Lionel Messi, Neymar, Julian
-- Alvarez, Hirving Lozano, Nico Williams, Santiago Gimenez, Mehdi
-- Taremi, etc.
--
-- Fix:
--  1) Migra palpites_artilheiro do registro NULL pro com time_id
--  2) DELETE dos registros NULL órfãos
--
-- A função f_unaccent já existe (criada em 20260520000006). Esta
-- migration roda DEPOIS dela.
-- =====================================================================

-- 1) Migra palpites_artilheiro do NULL pro completo (preserva palpites)
with pares as (
  select n.id as id_null, c.id as id_completo
  from public.players n
  join public.players c
    on lower(public.f_unaccent(trim(n.nome))) = lower(public.f_unaccent(trim(c.nome)))
  where n.time_id is null
    and c.time_id is not null
)
update public.palpites_artilheiro pa
set player_id = p.id_completo
from pares p
where pa.player_id = p.id_null;

-- 2) DELETE dos registros NULL órfãos (após migrar palpites)
with pares as (
  select n.id as id_null
  from public.players n
  join public.players c
    on lower(public.f_unaccent(trim(n.nome))) = lower(public.f_unaccent(trim(c.nome)))
  where n.time_id is null
    and c.time_id is not null
)
delete from public.players p
using pares pr
where p.id = pr.id_null;
