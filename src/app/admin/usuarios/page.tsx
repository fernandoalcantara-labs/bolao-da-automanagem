import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { UsuariosTable } from "./usuarios-table";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  await requireAdmin();
  const supabase = createClient();
  const [{ data: users }, { data: snaps }] = await Promise.all([
    supabase
      .from("users")
      .select("id, nome, email, telefone, role, pago, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("ranking_snapshots")
      .select("user_id, pontos_totais, rodada_ordem"),
  ]);

  // Pega os pontos totais da última snapshot de cada user
  const totaisPorUser = new Map<string, number>();
  for (const s of (snaps ?? []) as any[]) {
    const cur = totaisPorUser.get(s.user_id);
    if (cur === undefined) totaisPorUser.set(s.user_id, s.pontos_totais);
    else totaisPorUser.set(s.user_id, Math.max(cur, s.pontos_totais));
  }

  const enriched = (users ?? []).map((u: any) => ({
    ...u,
    pontos_totais: totaisPorUser.get(u.id) ?? 0,
  }));

  const total = enriched.length;
  const pagos = enriched.filter((u: any) => u.pago).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuários · {total} cadastrados · {pagos} pagos</CardTitle>
          <CardDescription>
            Confirme pagamentos, promova admins e veja a memória de cálculo de cada um.
          </CardDescription>
        </CardHeader>
      </Card>

      <UsuariosTable users={enriched as any} />
    </div>
  );
}
