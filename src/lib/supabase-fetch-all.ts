import type { SupabaseClient } from "@supabase/supabase-js";

type SB = SupabaseClient<any, any, any>;

/**
 * Busca TODAS as linhas de uma tabela em páginas de 1000 — necessário porque
 * o PostgREST do Supabase Cloud tem max_rows=1000 HARD CAP (mesmo passando
 * `.limit(50000)` ele corta em 1000). Um `.select()` simples numa tabela com
 * mais de 1000 linhas devolve só as primeiras 1000, silenciosamente.
 *
 * Sempre pagina com uma ORDEM ESTÁVEL (`orderBy`, default "id") pra não pular
 * nem repetir linha na virada de página.
 *
 * Bugs históricos por esquecer isso (mantém o porquê documentado):
 *  - CSV (CT-21/QW4): palpites_grupos com >1000 linhas → CSV só pegava 1000,
 *    metade dos users aparecia com "-" em jogos que palpitaram.
 *  - Painel/recalc (2026-06): com >1000 palpites_grupos (1252/rodada), o
 *    gerarSnapshots / calcularR32PorUsuario / recalcularPalpitesGrupos
 *    truncavam → R1/R2/R3 subcontados e R32 incompleto no snapshot, então o
 *    painel divergia da memória de cálculo do admin (que é por-usuário).
 */
export async function fetchAll<T = any>(
  supabase: SB,
  table: string,
  select: string,
  orderBy: string = "id",
): Promise<T[]> {
  const all: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return all;
}
