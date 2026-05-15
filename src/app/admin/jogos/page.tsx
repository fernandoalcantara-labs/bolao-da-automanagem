import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { JogosTable } from "./jogos-table";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminJogosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, fase, rodada, grupo, time_casa_id, time_fora_id, data_hora, status, placar_casa, placar_fora, editado_manualmente")
      .order("data_hora", { ascending: true }),
    supabase.from("teams").select("id, nome, bandeira_url, grupo"),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar jogos</CardTitle>
          <CardDescription>
            Edite placar e status. Marcar manualmente impede que a sincronização sobrescreva.
          </CardDescription>
        </CardHeader>
      </Card>

      <JogosTable matches={(matches ?? []) as any} teams={(teams ?? []) as any} />
    </div>
  );
}
