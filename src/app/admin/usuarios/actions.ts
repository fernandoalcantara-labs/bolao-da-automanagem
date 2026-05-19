"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularBreakdown, type Breakdown } from "@/lib/scoring-breakdown";

/**
 * Server Action: retorna a memória de cálculo de um usuário.
 * Acesso restrito a admin (RLS reforçada server-side aqui).
 */
export async function getBreakdownAction(userId: string): Promise<
  { ok: true; data: Breakdown } | { ok: false; error: string }
> {
  // Auth: só admin pode chamar
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { ok: false, error: "Não autenticado" };
  const { data: perfil } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();
  if ((perfil as any)?.role !== "admin") {
    return { ok: false, error: "Apenas administradores" };
  }

  // Usa admin client pra contornar RLS de palpites alheios
  try {
    const admin = createAdminClient();
    const b = await calcularBreakdown(admin as any, userId);
    return { ok: true, data: b };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
