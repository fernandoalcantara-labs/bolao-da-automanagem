import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";

type SupabaseLike = { from: (table: string) => any };

/**
 * Estado EFETIVO das apostas (modelo B2) — espelha o trigger
 * `bloquear_palpite_se_encerrado` (migration 20260525000016):
 *
 *   • apostas_override = true   → MANUAL: apostas_encerradas manda (independe
 *                                 do prazo; admin pode reabrir/fechar).
 *   • apostas_override = false  → AUTOMÁTICO: segue o prazo (DEADLINE).
 *
 * Usado pelas páginas de palpite pra calcular `fechado` igual ao banco —
 * assim a UI já abre travada quando deveria, sem depender só do erro do save.
 */
export async function apostasFechadas(supabase: SupabaseLike): Promise<boolean> {
  const { data } = await supabase
    .from("config")
    .select("chave, valor")
    .in("chave", ["apostas_encerradas", "apostas_override"]);
  const cfg = new Map((data ?? []).map((r: any) => [r.chave, r.valor]));
  const encerradas = cfg.get("apostas_encerradas") === true;
  const override = cfg.get("apostas_override") === true;
  return override ? encerradas : Date.now() >= DEADLINE_FASE_GRUPOS.getTime();
}
