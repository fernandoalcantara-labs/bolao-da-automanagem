import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { PalpitesGruposForm } from "./palpites-form";
import { Countdown } from "@/components/misc/countdown";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import { PONTUACAO_DEFAULT, normalizarPontuacao } from "@/lib/scoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PalpitesGruposPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: matches }, { data: teams }, { data: palpites }, { data: cfgRow }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, fase, rodada, grupo, time_casa_id, time_fora_id, data_hora, status, placar_casa, placar_fora")
      .eq("fase", "grupos")
      .order("data_hora", { ascending: true }),
    supabase.from("teams").select("id, nome, codigo_fifa, bandeira_url, grupo"),
    supabase
      .from("palpites_grupos")
      .select("match_id, placar_casa, placar_fora")
      .eq("user_id", user.id),
    supabase.from("config").select("valor").eq("chave", "pontuacao").maybeSingle(),
  ]);

  if (!matches || !teams) redirect("/");
  const pontuacao = normalizarPontuacao((cfgRow?.valor as any) ?? PONTUACAO_DEFAULT);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const palpitesMap = new Map(palpites?.map((p) => [p.match_id, p]) ?? []);
  const deadline = DEADLINE_FASE_GRUPOS;
  const fechado = Date.now() >= deadline.getTime();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Palpites · Fase de grupos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Aposte no <strong>placar exato</strong> dos 72 jogos. Pontos: <span className="text-primary">5</span> placar
              exato · <span className="text-primary">2</span> vencedor/empate.
            </p>
          </div>
          <Countdown target={deadline} label="Encerra em" />
        </CardHeader>
      </Card>

      <PalpitesGruposForm
        matches={matches as any}
        teams={Object.fromEntries(teamMap)}
        palpites={Object.fromEntries(palpitesMap)}
        fechado={fechado}
        userId={user.id}
        pontuacao={pontuacao}
      />
    </div>
  );
}
