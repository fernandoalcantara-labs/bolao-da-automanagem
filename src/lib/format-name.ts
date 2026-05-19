/**
 * Helpers de formatação de nome de exibição.
 *
 * Estratégia (QW3 item 16, regra do Fernando):
 *  - KPI Cards / Ranking público / multi-line chart tooltip / admin
 *    → exibem `nome_exibicao` cru (escolha do usuário, configurável via
 *      /perfil). Default vem como 'Primeiro Segundo' (primeiro nome +
 *      primeira palavra do sobrenome) setado pelo trigger handle_new_user.
 *  - Heatmap / Bar chart → `formatShortName` (só primeiro nome, espaço
 *    escasso na visualização).
 */

/** Só o primeiro nome — pra contextos compactos (heatmap, bar chart). */
export function formatShortName(nome: string | null | undefined): string {
  if (!nome) return "—";
  return nome.trim().split(/\s+/)[0] ?? "—";
}
