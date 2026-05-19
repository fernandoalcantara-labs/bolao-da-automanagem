"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AtualizarPerfilInput = {
  nome: string;
  nome_exibicao: string;
  telefone: string | null;
};

export async function atualizarPerfilAction(
  input: AtualizarPerfilInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return { ok: false, error: "Não autenticado" };

  // Validações
  const nomeExib = input.nome_exibicao.trim();
  if (nomeExib.length < 2 || nomeExib.length > 30) {
    return { ok: false, error: "Nome de exibição precisa ter entre 2 e 30 caracteres." };
  }
  if (!/^[\p{L}\p{N}\s'\-]+$/u.test(nomeExib)) {
    return { ok: false, error: "Use apenas letras, números, espaço, hífen e apóstrofo." };
  }

  const nome = input.nome.trim();
  if (nome.length < 3) {
    return { ok: false, error: "Nome completo precisa ter pelo menos 3 caracteres." };
  }

  // Checa unicidade do nome_exibicao (case-insensitive) via admin client
  const admin = createAdminClient();
  const { data: existente } = await admin
    .from("users")
    .select("id")
    .ilike("nome_exibicao", nomeExib)
    .neq("id", authUser.id)
    .maybeSingle();
  if (existente) {
    return {
      ok: false,
      error: "Esse nome já tá sendo usado por outro craque 😅 Tenta variar.",
    };
  }

  const { error } = await admin
    .from("users")
    .update({
      nome,
      nome_exibicao: nomeExib,
      telefone: input.telefone,
    })
    .eq("id", authUser.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
