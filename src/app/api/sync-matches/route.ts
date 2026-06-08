import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarPartidasWC, buscarArtilheirosWC, mapearStatus, mapearFase } from "@/lib/football-data";
import { recalcularTudo } from "@/lib/recalc";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sincroniza matches e artilheiros com a football-data.org.
 * Chamado por cron Vercel (header Authorization Bearer + CRON_SECRET) ou
 * manualmente pelo admin via /admin (botão "Sincronizar agora").
 */
export async function GET(request: NextRequest) {
  if (!await autorizar(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Freio do cron (4B): se a chamada veio pelo CRON (Bearer CRON_SECRET) e o
  // admin desligou `sync_automatico`, não escreve nada. A sync MANUAL do
  // admin (sessão autenticada) continua funcionando normalmente.
  const viaCron =
    request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (viaCron) {
    const { data: cfg } = await supabase
      .from("config")
      .select("valor")
      .eq("chave", "sync_automatico")
      .maybeSingle();
    const ligado = cfg?.valor !== false; // default ligado se a chave não existir
    if (!ligado) {
      return NextResponse.json({ ok: true, skipped: "sync automático desligado pelo admin" });
    }
  }

  const partidas = await buscarPartidasWC();

  let atualizados = 0;
  for (const p of partidas) {
    const fase = mapearFase(p.stage);
    if (!fase) continue;
    const status = mapearStatus(p.status);
    const placar_casa = p.score.fullTime.home;
    const placar_fora = p.score.fullTime.away;

    // Match já existente? identifica por api_match_id
    const { data: existing } = await supabase
      .from("matches")
      .select("id, editado_manualmente")
      .eq("api_match_id", String(p.id))
      .maybeSingle();

    if (existing?.editado_manualmente) continue; // respeita override do admin

    if (existing) {
      const { error } = await supabase
        .from("matches")
        .update({
          status,
          placar_casa: status !== "agendado" ? placar_casa : null,
          placar_fora: status !== "agendado" ? placar_fora : null,
          data_hora: p.utcDate,
        })
        .eq("id", existing.id);
      if (!error) atualizados++;
    }
  }

  // Atualiza gols do top de artilheiros
  try {
    const scorers = await buscarArtilheirosWC(50);
    for (const s of scorers) {
      await supabase
        .from("players")
        .update({ gols_torneio: s.goals })
        .ilike("nome", s.player.name);
    }
  } catch (e) {
    console.warn("Falha ao sincronizar artilheiros:", e);
  }

  await recalcularTudo(supabase);

  return NextResponse.json({ ok: true, atualizados });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function autorizar(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Permite também admin autenticado
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: perfil } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    return perfil?.role === "admin";
  } catch {
    return false;
  }
}
