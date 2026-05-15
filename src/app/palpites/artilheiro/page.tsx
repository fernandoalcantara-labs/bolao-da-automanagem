import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { ArtilheiroForm } from "./artilheiro-form";
import { Countdown } from "@/components/misc/countdown";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ArtilheiroPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: players }, { data: teams }, { data: atual }] = await Promise.all([
    supabase
      .from("players")
      .select("id, nome, time_id, gols_torneio")
      .order("nome", { ascending: true }),
    supabase.from("teams").select("id, nome, bandeira_url"),
    supabase
      .from("palpites_artilheiro")
      .select("player_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const fechado = Date.now() >= DEADLINE_FASE_GRUPOS.getTime();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Palpite · Artilheiro da Copa</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha 1 jogador. Vale <span className="text-primary">24 pontos</span> + bonus de rateio (10%).
            </p>
          </div>
          <Countdown target={DEADLINE_FASE_GRUPOS} label="Encerra em" />
        </CardHeader>
      </Card>

      <ArtilheiroForm
        players={(players ?? []).map((p) => ({
          ...p,
          time_nome: teamMap.get(p.time_id ?? "")?.nome ?? "—",
          bandeira_url: teamMap.get(p.time_id ?? "")?.bandeira_url ?? "",
        }))}
        atual={atual?.player_id ?? null}
        fechado={fechado}
      />
    </div>
  );
}
