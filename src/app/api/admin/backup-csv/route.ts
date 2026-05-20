import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gerarCsvCompleto } from "@/lib/export-csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/backup-csv
 *
 * Gera o CSV completo, salva em `csv_backups` com tipo `manual_admin`,
 * e retorna { id, conteudo } pro client baixar imediatamente.
 *
 * GET /api/admin/backup-csv?id=N
 *
 * Re-baixa um backup ja' salvo.
 */
export async function POST(_: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (perfil?.role !== "admin") return NextResponse.json({ error: "Apenas admin" }, { status: 403 });

  const admin = createAdminClient();
  const { csv, stats } = await gerarCsvCompleto(admin);
  const dataStr = new Date().toISOString().slice(0, 10);
  const arquivo_nome = `bolao-backup-manual-${dataStr}.csv`;

  const { data: inserted, error } = await admin
    .from("csv_backups")
    .insert({
      tipo: "manual_admin",
      gerado_por: user.id,
      arquivo_nome,
      conteudo_csv: csv,
      tamanho_bytes: stats.tamanho_bytes,
      total_usuarios: stats.total_usuarios,
      total_palpites: stats.total_palpites,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    arquivo_nome,
    conteudo: csv,
    stats,
  });
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: perfil } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (perfil?.role !== "admin") return NextResponse.json({ error: "Apenas admin" }, { status: 403 });

  const idParam = req.nextUrl.searchParams.get("id");
  if (!idParam) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data: backup, error } = await admin
    .from("csv_backups")
    .select("arquivo_nome, conteudo_csv")
    .eq("id", Number(idParam))
    .single();
  if (error || !backup) return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });

  return new NextResponse(backup.conteudo_csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${backup.arquivo_nome}"`,
    },
  });
}
