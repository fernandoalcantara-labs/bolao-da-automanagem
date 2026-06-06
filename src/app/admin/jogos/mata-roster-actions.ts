"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRosterTodasFases, FASES_MATA } from "@/lib/mata-roster";
import type { FasePalpiteMata } from "@/types/database";

type Resp = { ok: true } | { ok: false; error: string };

async function exigirAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if ((perfil as any)?.role !== "admin") return { ok: false, error: "Apenas administradores" };
  return { ok: true };
}

/**
 * Liga/desliga uma seleção numa fase do mata (override manual com cadeado).
 * Cascata na escrita:
 *  - LIGAR em F → garante incluir nas fases ≤ F (rasas) onde ainda não está.
 *  - DESLIGAR em F → garante excluir nas fases ≥ F (profundas) onde está.
 * Persiste só (rápido). O recálculo é disparado pelo client (otimista).
 */
export async function toggleTimeNaFase(fase: FasePalpiteMata, timeId: string): Promise<Resp> {
  const auth = await exigirAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();

  const { rosters } = await getRosterTodasFases(admin as any);
  const estaDentro = rosters.get(fase)?.has(timeId) ?? false;
  const idx = FASES_MATA.indexOf(fase);
  const nowIso = new Date().toISOString();

  const upserts: { fase: FasePalpiteMata; time_id: string; incluir: boolean; updated_at: string }[] = [];

  if (estaDentro) {
    // DESLIGAR: exclui de F e fases mais PROFUNDAS onde está presente.
    for (let i = idx; i < FASES_MATA.length; i++) {
      const f = FASES_MATA[i];
      if (rosters.get(f)?.has(timeId)) upserts.push({ fase: f, time_id: timeId, incluir: false, updated_at: nowIso });
    }
  } else {
    // LIGAR: inclui em F e fases mais RASAS onde ainda não está.
    for (let i = 0; i <= idx; i++) {
      const f = FASES_MATA[i];
      if (!rosters.get(f)?.has(timeId)) upserts.push({ fase: f, time_id: timeId, incluir: true, updated_at: nowIso });
    }
  }

  if (upserts.length > 0) {
    const { error } = await admin
      .from("mata_roster_override")
      .upsert(upserts as any, { onConflict: "fase,time_id" });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * "Recalcular automático" dos 16 avos: descarta os overrides manuais da
 * fase 16avos → volta a refletir a classificação provisória dos grupos.
 * Não toca nas outras fases. Recalc disparado pelo client.
 */
export async function recalcularAutomatico16avos(): Promise<Resp> {
  const auth = await exigirAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { error } = await admin.from("mata_roster_override").delete().eq("fase", "16avos");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
