import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { MataMataForm } from "./mata-mata-form";
import { Countdown } from "@/components/misc/countdown";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MataMataPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: teams }, { data: palpites }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, nome, codigo_fifa, bandeira_url, grupo, tbd")
      .order("grupo")
      .order("nome"),
    supabase
      .from("palpites_mata")
      .select("time_id, fase")
      .eq("user_id", user.id),
  ]);

  const fechado = Date.now() >= DEADLINE_FASE_GRUPOS.getTime();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Palpites · Mata-mata</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Marque até onde cada seleção chega. Pontos: <span className="text-primary">8</span> · 12 · 16 · 20 · 24 (vice) · 40 (campeão).
            </p>
          </div>
          <Countdown target={DEADLINE_FASE_GRUPOS} label="Encerra em" />
        </CardHeader>
      </Card>

      <MataMataForm
        teams={(teams ?? []) as any}
        palpites={(palpites ?? []) as any}
        fechado={fechado}
      />
    </div>
  );
}
