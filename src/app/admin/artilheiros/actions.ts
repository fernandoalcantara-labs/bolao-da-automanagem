"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Resp = { ok: true } | { ok: false; error: string };

async function exigirAdmin(): Promise<Resp> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if ((perfil as any)?.role !== "admin") return { ok: false, error: "Apenas administradores" };
  return { ok: true };
}

/**
 * Marca/desmarca um palpite de artilheiro como acertador (campo `acertou`).
 *
 * Escreve via SERVICE_ROLE (admin client) de propósito: assim a validação
 * continua funcionando DEPOIS do prazo/encerramento, porque o trigger
 * `bloquear_palpite_se_encerrado` só isenta service_role — não mais o admin.
 * (Antes era um `update` direto pelo client/is_admin, que dependia da isenção
 * de admin no trigger; isso deixava o admin também burlar o bloqueio nas
 * PRÓPRIAS apostas. Agora a validação é service_role e o admin-jogador é
 * barrado como todo mundo.)
 */
export async function setArtilheiroAcertou(palpiteId: string, acertou: boolean): Promise<Resp> {
  const auth = await exigirAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { error } = await admin
    .from("palpites_artilheiro")
    .update({ acertou })
    .eq("id", palpiteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
