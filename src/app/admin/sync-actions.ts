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
 * Encerra/reabre TODAS as apostas no modo MANUAL (item 50, modelo B2).
 * Mexer aqui liga o override (apostas_override = true): a chave passa a mandar
 * mais que o prazo (pode fechar antes ou reabrir depois). O trigger no banco
 * recusa a gravação de qualquer palpite (grupos/mata/artilheiro) quando
 * encerradas. Use setApostasAutomatico() pra devolver o controle ao prazo.
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
  const { error } = await admin.from("config").upsert(
    [
      { chave: "apostas_encerradas", valor: encerradas as any },
      { chave: "apostas_override", valor: true as any }, // mexeu → controle manual
    ],
    { onConflict: "chave" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Devolve o controle das apostas ao AUTOMÁTICO (apostas_override = false):
 * volta a seguir o prazo (DEADLINE_FASE_GRUPOS), ignorando a chave manual.
 */
export async function setApostasAutomatico(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if ((perfil as any)?.role !== "admin") return { ok: false, error: "Apenas administradores" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("config")
    .upsert({ chave: "apostas_override", valor: false as any }, { onConflict: "chave" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
