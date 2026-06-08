-- =====================================================================
-- PARTE 3B — Rename da pontuação do mata pro padrão "fase alcançada" (pts_*)
-- + nova faixa pts_r32 ("16 Avos")
-- =====================================================================
-- Remapeia por SIGNIFICADO (nunca nome-com-nome):
--   pts_oitavas ← mata_16avos   (chegou às oitavas)
--   pts_quartas ← mata_8avos    (chegou às quartas)
--   pts_semi    ← mata_quartas  (chegou à semi)
--   pts_final   ← mata_semi     (chegou à final)
--   pts_r32     ← (novo)        default 2  — classificou ao R32 (16 Avos)
-- vice/campeao/artilheiro/placar_exato/vencedor_ou_empate ficam intactos.
-- Mantém os mata_* legados (rollback / backward-compat). Idempotente.

update public.config
set valor = valor || jsonb_build_object(
  'pts_r32',     coalesce((valor->>'pts_r32')::int, 2),
  'pts_oitavas', coalesce((valor->>'pts_oitavas')::int, (valor->>'mata_16avos')::int, 8),
  'pts_quartas', coalesce((valor->>'pts_quartas')::int, (valor->>'mata_8avos')::int, 12),
  'pts_semi',    coalesce((valor->>'pts_semi')::int, (valor->>'mata_quartas')::int, 16),
  'pts_final',   coalesce((valor->>'pts_final')::int, (valor->>'mata_semi')::int, 20)
)
where chave = 'pontuacao';
