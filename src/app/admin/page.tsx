import Link from "next/link";
import {
  CalendarDays,
  Users,
  Settings,
  RefreshCw,
  Calculator,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminActions } from "./admin-actions";
import { BackupCsvSection, type BackupItem } from "./backup-csv-section";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createClient();

  const [
    { count: totalUsuarios },
    { count: usuariosPagos },
    { count: totalJogos },
    { count: jogosFinalizados },
    { data: backupsRaw },
    { data: syncCfg },
    { data: apostasCfg },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("pago", true),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "finalizado"),
    supabase
      .from("csv_backups")
      .select("id, tipo, gerado_em, gerado_por, arquivo_nome, tamanho_bytes, total_usuarios, total_palpites")
      .order("gerado_em", { ascending: false })
      .limit(50),
    supabase.from("config").select("valor").eq("chave", "sync_automatico").maybeSingle(),
    supabase.from("config").select("chave, valor").in("chave", ["apostas_encerradas", "apostas_override"]),
  ]);
  const syncAutomatico = (syncCfg?.valor as boolean | undefined) !== false; // default ligado
  const apostasCfgMap = new Map(((apostasCfg ?? []) as any[]).map((r) => [r.chave, r.valor]));
  const apostasEncerradas = apostasCfgMap.get("apostas_encerradas") === true; // default aberto
  const apostasOverride = apostasCfgMap.get("apostas_override") === true; // default automático

  // Resolve nome dos admins que geraram backup manual (1 query batch)
  const adminIds = Array.from(
    new Set((backupsRaw ?? []).map((b: any) => b.gerado_por).filter(Boolean)),
  );
  const adminNomes = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await supabase
      .from("users")
      .select("id, nome_exibicao, nome")
      .in("id", adminIds);
    for (const a of (admins ?? []) as any[]) {
      adminNomes.set(a.id, a.nome_exibicao ?? a.nome);
    }
  }
  const backups: BackupItem[] = (backupsRaw ?? []).map((b: any) => ({
    ...b,
    gerado_por_nome: b.gerado_por ? adminNomes.get(b.gerado_por) ?? null : null,
  }));

  const cards = [
    {
      href: "/admin/jogos",
      icon: CalendarDays,
      title: "Jogos",
      desc: `${jogosFinalizados ?? 0} finalizados de ${totalJogos ?? 0}`,
    },
    {
      href: "/admin/usuarios",
      icon: Users,
      title: "Usuários",
      desc: `${usuariosPagos ?? 0} pagos · ${totalUsuarios ?? 0} cadastrados`,
    },
    {
      href: "/admin/selecoes",
      icon: CalendarDays,
      title: "Seleções",
      desc: "48 seleções e grupos da Copa",
    },
    {
      href: "/admin/artilheiros",
      icon: CalendarDays,
      title: "Validar Artilheiros",
      desc: "Confirma palpites de artilheiro",
    },
    { href: "/admin/config", icon: Settings, title: "Configurações", desc: "Pontuação, PIX, rateio" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Painel do Admin</h1>
        <p className="text-sm text-muted-foreground">Apenas administradores do bolão veem esta tela.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="h-full transition-colors hover:border-primary/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <c.icon className="h-4 w-4 text-primary" /> {c.title}
                </CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4" /> Ações
          </CardTitle>
          <CardDescription>Sincronizar com a API e recalcular pontuações.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminActions
            syncAutomaticoInicial={syncAutomatico}
            apostasEncerradasInicial={apostasEncerradas}
            apostasOverrideInicial={apostasOverride}
          />
        </CardContent>
      </Card>

      <BackupCsvSection backupsIniciais={backups} />
    </div>
  );
}
