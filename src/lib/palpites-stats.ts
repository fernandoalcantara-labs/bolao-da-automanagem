import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quantidades esperadas de palpites por usuário (todas as fases combinadas).
 * 72 (grupos) + 16+8+4+2+1 (mata-mata = 31) + 1 (artilheiro) = 104
 */
export const PALPITES_ESPERADOS = 72 + 31 + 1;

/**
 * Conta quantos palpites o usuário fez (em todas as fases).
 */
export async function contarPalpitesUsuario(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ feitos: number; esperados: number }> {
  const [g, m, a] = await Promise.all([
    supabase
      .from("palpites_grupos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("palpites_mata")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("palpites_artilheiro")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const feitos = (g.count ?? 0) + (m.count ?? 0) + (a.count ?? 0);
  return { feitos, esperados: PALPITES_ESPERADOS };
}
