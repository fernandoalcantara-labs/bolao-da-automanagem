import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { UsuariosTable } from "./usuarios-table";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  await requireAdmin();
  const supabase = createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, nome, email, telefone, role, pago, created_at")
    .order("created_at", { ascending: true });

  const total = users?.length ?? 0;
  const pagos = users?.filter((u) => u.pago).length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Usuários · {total} cadastrados · {pagos} pagos</CardTitle>
          <CardDescription>Confirme pagamentos e promova admins.</CardDescription>
        </CardHeader>
      </Card>

      <UsuariosTable users={(users ?? []) as any} />
    </div>
  );
}
