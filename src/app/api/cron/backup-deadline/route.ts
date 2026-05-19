import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarCsvCompleto } from "@/lib/export-csv";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron job da Vercel — roda a cada 5 minutos.
 * Gera o backup automatico do deadline da fase de grupos APENAS:
 *  1. Dentro da janela de ±15 min do DEADLINE_FASE_GRUPOS
 *  2. Se ainda nao existe um backup tipo='deadline_grupos'
 *
 * Header esperado: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  // Autorização
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const agora = Date.now();
  const deadline = DEADLINE_FASE_GRUPOS.getTime();
  const JANELA_MS = 15 * 60 * 1000; // ±15 min

  if (Math.abs(agora - deadline) > JANELA_MS) {
    return NextResponse.json({ ok: true, skipped: "fora da janela do deadline", agora, deadline });
  }

  const admin = createAdminClient();

  // Já gerou backup do deadline?
  const { data: existente } = await admin
    .from("csv_backups")
    .select("id, gerado_em")
    .eq("tipo", "deadline_grupos")
    .maybeSingle();

  if (existente) {
    return NextResponse.json({
      ok: true,
      skipped: "ja gerado",
      backup_id: existente.id,
      gerado_em: existente.gerado_em,
    });
  }

  // Gera + salva
  const { csv, stats } = await gerarCsvCompleto(admin);
  const dataStr = new Date().toISOString().slice(0, 10);
  const arquivo_nome = `bolao-deadline-grupos-${dataStr}.csv`;

  const { data: inserted, error } = await admin
    .from("csv_backups")
    .insert({
      tipo: "deadline_grupos",
      gerado_por: null, // automático
      arquivo_nome,
      conteudo_csv: csv,
      tamanho_bytes: stats.tamanho_bytes,
      total_usuarios: stats.total_usuarios,
      total_palpites: stats.total_palpites,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    gerado: true,
    backup_id: inserted.id,
    arquivo_nome,
    stats,
  });
}
