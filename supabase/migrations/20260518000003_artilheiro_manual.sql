-- =====================================================================
-- Item 7.3 — Permite palpite de artilheiro com nome manual (texto livre)
-- =====================================================================

-- player_id passa a ser opcional; player_nome_manual entra como alternativa
alter table public.palpites_artilheiro
  alter column player_id drop not null,
  add column if not exists player_nome_manual text;

-- Constraint: exatamente um dos dois deve estar preenchido
alter table public.palpites_artilheiro
  drop constraint if exists palpites_artilheiro_exclusive;

alter table public.palpites_artilheiro
  add constraint palpites_artilheiro_exclusive
  check (
    (player_id is not null and player_nome_manual is null)
    or (player_id is null and player_nome_manual is not null and length(trim(player_nome_manual)) > 0)
  );

create index if not exists palpites_artilheiro_manual_idx
  on public.palpites_artilheiro(player_nome_manual)
  where player_nome_manual is not null;
