import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { calcularBreakdown } from "@/lib/scoring-breakdown";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MinhaExportacaoContent } from "./minha-exportacao-content";

export const dynamic = "force-dynamic";

export default async function MinhaExportacaoPage() {
  const user = await requireUser();
  const supabase = createClient();

  const breakdown = await calcularBreakdown(supabase as any, user.id);

  // Stats rápidas
  const palpitesGrupos = breakdown.grupos.items.filter(
    (it) => it.palpite_casa !== null || it.palpite_fora !== null,
  ).length;
  const palpitesMata = breakdown.mata.items.length;
  const temArtilheiro = !!breakdown.artilheiro;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-2 sm:py-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-fredoka text-3xl font-extrabold">
          <Download className="h-7 w-7 text-festive-green" /> Minha Exportação
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Veja e exporte todos os seus palpites do bolão. 📥
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Resumo</CardTitle>
          <CardDescription>Sua situação no bolão neste momento.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pontos" valor={breakdown.total.toString()} cor="text-festive-green" />
            <Stat
              label="Posição"
              valor={breakdown.posicao_atual ? `${breakdown.posicao_atual}º` : "—"}
              cor="text-festive-gold-dark"
            />
            <Stat label="Palpites grupos" valor={`${palpitesGrupos}/72`} cor="text-foreground" />
            <Stat
              label="Mata + Art."
              valor={`${palpitesMata} + ${temArtilheiro ? 1 : 0}`}
              cor="text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <MinhaExportacaoContent breakdown={breakdown} />
    </div>
  );
}

function Stat({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="rounded-xl border-2 border-border bg-festive-page/40 p-3 text-center">
      <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-fredoka text-2xl font-extrabold ${cor}`}>{valor}</p>
    </div>
  );
}
