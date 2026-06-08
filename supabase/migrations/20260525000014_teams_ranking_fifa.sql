-- =====================================================================
-- PARTE 3C — Ranking FIFA das seleções (desempate dos 8 melhores 3ºs)
-- =====================================================================
-- Adiciona teams.ranking_fifa (nullable) e POPULA as 48 seleções existentes
-- por nome (produção não será re-semeada). Base: abril/2026 (menor = melhor).
-- Usado SÓ como penúltimo critério de desempate dos 3ºs (pontos → saldo →
-- gols pró → ranking_fifa → time_id). Fallback estável: ausência → time_id.
-- Idempotente.
--
-- ⚠️ Nomes conferidos contra teams.nome (= SELECOES). Em particular:
--   "Curaçao" (o spec escreveu "Curaçau"), "RD do Congo", "Costa do Marfim".

alter table public.teams add column if not exists ranking_fifa int;

update public.teams t
set ranking_fifa = r.rk
from (values
  ('México', 15), ('África do Sul', 60), ('Coreia do Sul', 25), ('Tchéquia', 41),
  ('Canadá', 30), ('Bósnia e Herzegovina', 64), ('Catar', 55), ('Suíça', 19),
  ('Brasil', 6), ('Marrocos', 8), ('Haiti', 82), ('Escócia', 43),
  ('Estados Unidos', 16), ('Paraguai', 40), ('Austrália', 27), ('Turquia', 22),
  ('Alemanha', 10), ('Curaçao', 83), ('Costa do Marfim', 34), ('Equador', 24),
  ('Holanda', 7), ('Japão', 18), ('Suécia', 38), ('Tunísia', 46),
  ('Bélgica', 9), ('Egito', 29), ('Irã', 21), ('Nova Zelândia', 85),
  ('Espanha', 2), ('Cabo Verde', 68), ('Arábia Saudita', 61), ('Uruguai', 17),
  ('França', 1), ('Senegal', 14), ('Iraque', 57), ('Noruega', 31),
  ('Argentina', 3), ('Argélia', 28), ('Áustria', 23), ('Jordânia', 63),
  ('Portugal', 5), ('RD do Congo', 45), ('Uzbequistão', 50), ('Colômbia', 13),
  ('Inglaterra', 4), ('Croácia', 11), ('Gana', 73), ('Panamá', 33)
) as r(nome, rk)
where t.nome = r.nome;
