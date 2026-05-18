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

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createClient();

  const [
    { count: totalUsuarios },
    { count: usuariosPagos },
    { count: totalJogos },
    { count: jogosFinalizados },
  ] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("pago", true),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "finalizado"),
  ]);

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
          <AdminActions />
        </CardContent>
      </Card>
    </div>
  );
}
