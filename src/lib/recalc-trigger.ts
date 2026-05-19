/**
 * Trigger debounced de /api/recalcular pro client.
 *
 * Por que existir:
 * - Várias telas do admin (jogos, artilheiros) mexem em dados que afetam
 *   pontuação. Se cada edição disparasse um recalc imediato, salvar 10
 *   jogos em sequência rodaria 10 recálculos completos.
 * - Esse helper junta múltiplas chamadas em janela de 1.5s — recalc roda
 *   uma vez só com o estado final.
 * - É idempotente: chamar 5x = mesmo resultado de chamar 1x.
 *
 * Como usar:
 *   import { triggerRecalcDebounced } from "@/lib/recalc-trigger";
 *   await supabase.from(...).update(...);
 *   triggerRecalcDebounced(); // fire-and-forget
 */

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

export type RecalcTriggerResult = "success" | "error" | "deduped";

const DEFAULT_DELAY_MS = 1500;

export function triggerRecalcDebounced(
  delayMs: number = DEFAULT_DELAY_MS,
): Promise<RecalcTriggerResult> {
  return new Promise((resolve) => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    pendingTimer = setTimeout(async () => {
      pendingTimer = null;
      if (inFlight) {
        // Outro recalc tá rolando — assume que vai cobrir nosso caso
        resolve("deduped");
        return;
      }
      inFlight = true;
      try {
        const res = await fetch("/api/recalcular", { method: "POST" });
        resolve(res.ok ? "success" : "error");
      } catch (e) {
        console.warn("[recalc-trigger] falha:", e);
        resolve("error");
      } finally {
        inFlight = false;
      }
    }, delayMs);
  });
}

/** Versão imediata pra casos específicos (raramente necessário). */
export async function triggerRecalcAgora(): Promise<RecalcTriggerResult> {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (inFlight) return "deduped";
  inFlight = true;
  try {
    const res = await fetch("/api/recalcular", { method: "POST" });
    return res.ok ? "success" : "error";
  } catch (e) {
    console.warn("[recalc-trigger] falha imediata:", e);
    return "error";
  } finally {
    inFlight = false;
  }
}
