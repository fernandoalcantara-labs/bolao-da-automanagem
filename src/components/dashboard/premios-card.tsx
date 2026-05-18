import { Trophy, Medal, Award, Turtle, Target } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { calcularRateio, type Premiacao } from "@/lib/prizes";
import { formatCurrency } from "@/lib/utils";
import type { RateioConfig } from "@/types/database";

type Props = {
  ranking: { user_id: string; nome: string; pontos: number }[];
  acertaramArtilheiro: string[];
  rateio: RateioConfig;
  totalArrecadado: number;
};

export function PremiosCard({ ranking, acertaramArtilheiro, rateio, totalArrecadado }: Props) {
  const p = calcularRateio(ranking, rateio, totalArrecadado, acertaramArtilheiro);
  const userMap = new Map(ranking.map((r) => [r.user_id, r.nome]));

  type Item = {
    key: keyof Premiacao;
    label: string;
    icon: any;
    cor: string;
    pct: number;
    p: Premiacao[keyof Premiacao];
  };
  const items: Item[] = (
    [
      { key: "primeiro", label: "Campeão", icon: Trophy, cor: "text-amber-400", pct: rateio.primeiro, p: p.primeiro },
      { key: "segundo", label: "Vice", icon: Medal, cor: "text-zinc-300", pct: rateio.segundo, p: p.segundo },
      { key: "terceiro", label: "3º lugar", icon: Award, cor: "text-orange-400", pct: rateio.terceiro, p: p.terceiro },
      { key: "lanterninha", label: "Lanterninha", icon: Turtle, cor: "text-emerald-400", pct: rateio.lanterninha, p: p.lanterninha },
      { key: "artilheiro", label: "Artilheiro", icon: Target, cor: "text-pink-400", pct: rateio.artilheiro, p: p.artilheiro },
    ] as Item[]
  ).filter((i) => i.pct > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Prêmios estimados</CardTitle>
        <CardDescription>
          Total arrecadado: <strong className="text-primary">{formatCurrency(totalArrecadado)}</strong>
          {rateio.artilheiro === 0 && (
            <span className="ml-2 text-xs">· Acertar o artilheiro vale 24 pts no ranking, mas não dá prêmio em dinheiro neste bolão.</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((i) => {
            const nomes = i.p.user_ids.map((id) => userMap.get(id) ?? "—").join(", ") || "—";
            return (
              <div key={i.key} className="rounded-lg border border-border/60 bg-card/60 p-3">
                <div className="flex items-center gap-2">
                  <i.icon className={`h-4 w-4 ${i.cor}`} />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {i.label} · {i.pct}%
                  </span>
                </div>
                <p className="mt-1.5 text-xl font-bold">
                  {formatCurrency(i.p.valor_por_pessoa || i.p.valor_total)}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {i.p.user_ids.length === 0
                    ? "ainda sem participantes nesta posição"
                    : i.p.user_ids.length > 1
                      ? `${i.p.user_ids.length} empatados · ${nomes}`
                      : nomes}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
