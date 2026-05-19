/**
 * Helpers de formatação de nome de exibição.
 *
 * Estratégia:
 *  - KPI Cards / Ranking público → "Primeiro Último" (Fernando Rocha)
 *    desambigua dois "Fernando" no mesmo bolão sem precisar de unique
 *  - Heatmap / Bar chart → "Primeiro" só (espaço escasso na visualização)
 */

/** Primeiro + último sobrenome, ou primeiro nome só se for único. */
export function formatRankingName(nome: string | null | undefined): string {
  if (!nome) return "—";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

/** Só o primeiro nome — pra contextos compactos. */
export function formatShortName(nome: string | null | undefined): string {
  if (!nome) return "—";
  return nome.trim().split(/\s+/)[0] ?? "—";
}
