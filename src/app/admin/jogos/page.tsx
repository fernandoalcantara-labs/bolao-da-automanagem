import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { JogosTable } from "./jogos-table";
import { RosterAdmin } from "./roster-admin";
import { montarRosterUI } from "@/lib/mata-roster";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminJogosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: matches }, { data: teams }, rosterUI] = await Promise.all([
    supabase
      .from("matches")
      .select("id, fase, rodada, grupo, time_casa_id, time_fora_id, data_hora, status, placar_casa, placar_fora, editado_manualmente")
      .eq("fase", "grupos")
      .order("data_hora", { ascending: true }),
    supabase.from("teams").select("id, nome, bandeira_url, grupo"),
    montarRosterUI(supabase as any),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>⚽ Fase de grupos · placares</CardTitle>
          <CardDescription>
            Edite placar e status dos 72 jogos. Marcar manualmente impede que a sincronização
            automática sobrescreva.
          </CardDescription>
        </CardHeader>
      </Card>

      <JogosTable matches={(matches ?? []) as any} teams={(teams ?? []) as any} />

      <Card>
        <CardHeader>
          <CardTitle>🏟️ Mata-mata · elenco por fase</CardTitle>
          <CardDescription>
            Marque (verde) as seleções que participam de cada fase. Os 16 avos saem
            automaticamente da classificação dos grupos; as demais fases você marca quem avançou.
            Ajustes manuais ganham 🔒 cadeado e sobrevivem ao recálculo automático.
          </CardDescription>
        </CardHeader>
      </Card>

      <RosterAdmin payload={rosterUI} />
    </div>
  );
}
