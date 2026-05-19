-- =====================================================================
-- QW3 Item 12 — nome_curto pras seleções
--
-- Pra cards muito apertados (bottom nav, badges, indicadores). Em cards
-- normais, usamos o nome completo com word-break:keep-all + overflow-wrap
-- (quebra em 2 linhas naturalmente).
-- =====================================================================

alter table public.teams
  add column if not exists nome_curto varchar(20);

-- Versões abreviadas conhecidas (≤ ~10 chars cada — cabe em cards bem pequenos)
update public.teams set nome_curto = 'C. Marfim'    where lower(unaccent(nome)) = 'costa do marfim';
update public.teams set nome_curto = 'Coreia Sul'   where lower(unaccent(nome)) = 'coreia do sul';
update public.teams set nome_curto = 'Africa Sul'   where lower(unaccent(nome)) = 'africa do sul';
update public.teams set nome_curto = 'P. Baixos'    where lower(unaccent(nome)) = 'paises baixos';
update public.teams set nome_curto = 'Bosnia-Herz.' where lower(unaccent(nome)) in ('bosnia e herzegovina', 'bosnia-herzegovina');
update public.teams set nome_curto = 'Cabo Verde'   where lower(unaccent(nome)) = 'cabo verde';
update public.teams set nome_curto = 'N. Zelandia'  where lower(unaccent(nome)) = 'nova zelandia';
update public.teams set nome_curto = 'A. Saudita'   where lower(unaccent(nome)) = 'arabia saudita';
update public.teams set nome_curto = 'Em. Arabes'   where lower(unaccent(nome)) in ('emirados arabes', 'emirados arabes unidos');
update public.teams set nome_curto = 'Rep. Tcheca'  where lower(unaccent(nome)) in ('republica tcheca', 'tchequia', 'chequia');
update public.teams set nome_curto = 'Eq. Guine'    where lower(unaccent(nome)) in ('guine equatorial', 'equatorial guine');
update public.teams set nome_curto = 'Rep. Dem. Congo' where lower(unaccent(nome)) in ('republica democratica do congo', 'r. d. congo', 'rd congo', 'dr congo');
update public.teams set nome_curto = 'Estados Unidos' where lower(unaccent(nome)) in ('estados unidos da america', 'estados unidos');

-- Para nomes simples (1-2 palavras curtas), copiar o próprio nome
update public.teams set nome_curto = nome where nome_curto is null;

-- A coluna fica nullable (default = nome) — não NOT NULL pra não quebrar
-- se entrar uma seleção nova via API antes de mapearmos abreviação.
