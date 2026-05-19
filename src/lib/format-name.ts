/**
 * Helpers de formatação de nome de exibição.
 *
 * Estratégia:
 *  - KPI Cards / Ranking público → "Primeiro Último" (Fernando Rocha)
 *    desambigua dois "Fernando" no mesmo bolão sem precisar de unique
 *  - Heatmap / Bar chart → "Primeiro" só (espaço escasso na visualização)
 *
 * Regra do ranking (QW3 item 16):
 *  - Uma palavra → mostra a palavra inteira ("Fernando", "Fernandinho")
 *  - Várias palavras + nome completo ≤ 20 chars → completo
 *  - Várias palavras + nome longo → "Primeiro Último"
 *    ("Fernando Aparecido da Silva" → "Fernando Silva")
 */

const MAX_LEN_COMPLETO = 20;

/** Primeiro + último sobrenome, ou nome completo se couber. */
export function formatRankingName(
  nome: string | null | undefined,
  maxLength: number = MAX_LEN_COMPLETO,
): string {
  if (!nome) return "—";
  const trimmed = nome.trim();
  if (trimmed === "") return "—";

  const partes = trimmed.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0];

  // Nome completo cabe no limite — mostra inteiro pra ficar mais natural
  if (trimmed.length <= maxLength) return trimmed;

  // Senão, primeiro + último (forma compacta porém identificável)
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

/** Só o primeiro nome — pra contextos compactos (heatmap, bar chart). */
export function formatShortName(nome: string | null | undefined): string {
  if (!nome) return "—";
  return nome.trim().split(/\s+/)[0] ?? "—";
}
