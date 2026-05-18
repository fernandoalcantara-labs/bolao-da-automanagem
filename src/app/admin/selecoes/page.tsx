import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { SelecoesTable } from "./selecoes-table";
import { IntegridadeReport } from "./integridade-report";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminSelecoesPage() {
  await requireAdmin();
  const supabase = createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome, codigo_fifa, bandeira_url, grupo, tbd")
    .order("grupo")
    .order("nome");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Seleções</CardTitle>
          <CardDescription>
            Edite nome, código FIFA ou grupo. Mudanças aplicam imediatamente.
          </CardDescription>
        </CardHeader>
      </Card>

      <IntegridadeReport teams={(teams ?? []) as any} />

      <SelecoesTable teams={(teams ?? []) as any} />
    </div>
  );
}
