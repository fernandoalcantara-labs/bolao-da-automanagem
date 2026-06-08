"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Liga/desliga a atualização automática de resultados (freio do cron, 4B).
 * Quando desligada, o /api/sync-matches chamado via cron retorna cedo sem
 * escrever. A sync manual do admin segue funcionando.
 */
export async function setSyncAutomatico(
  ligado: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if ((perfil as any)?.role !== "admin") return { ok: false, error: "Apenas administradores" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("config")
    .upsert({ chave: "sync_automatico", valor: ligado as any }, { onConflict: "chave" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Encerra/reabre TODAS as apostas (item 50). Quando encerradas, a RLS
 * recusa qualquer gravação de palpite (grupos/mata/campeão/artilheiro).
 * Freio manual caso a sincronização automática falhe.
 */
export async function setApostasEncerradas(
  encerradas: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if ((perfil as any)?.role !== "admin") return { ok: false, error: "Apenas administradores" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("config")
    .upsert({ chave: "apostas_encerradas", valor: encerradas as any }, { onConflict: "chave" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
