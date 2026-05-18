import { Trophy, Medal, Award, Turtle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Posicionado = {
  nomes: string[]; // pode ter múltiplos em caso de empate
  pontos: number;
};

type Props = {
  primeiro: Posicionado | null;
  segundo: Posicionado | null;
  terceiro: Posicionado | null;
  lanterninha: Posicionado | null;
};

const ITEMS = [
  { key: "primeiro", label: "Líder", icon: Trophy, cor: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  { key: "segundo", label: "2º lugar", icon: Medal, cor: "text-zinc-300", bg: "bg-zinc-400/10 border-zinc-400/30" },
  { key: "terceiro", label: "3º lugar", icon: Award, cor: "text-orange-400", bg: "bg-orange-700/10 border-orange-700/30" },
  { key: "lanterninha", label: "Lanterninha", icon: Turtle, cor: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
] as const;

export function KpiCards(props: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((i) => {
        const p = props[i.key];
        const nome = p?.nomes.length
          ? p.nomes.length === 1
            ? p.nomes[0]
            : `${p.nomes.length} empatados`
          : "—";
        return (
          <Card key={i.key} className={cn("overflow-hidden", i.bg)}>
            <CardContent className="flex flex-col gap-1.5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {i.label}
                </span>
                <i.icon className={cn("h-5 w-5", i.cor)} />
              </div>
              <p className="line-clamp-1 text-2xl font-bold leading-tight" title={p?.nomes.join(", ")}>
                {nome.split(" ")[0]}
                {nome.split(" ").length > 1 && nome.split(" ")[0] !== nome ? (
                  <span className="ml-1 text-base font-medium text-muted-foreground">
                    {nome.split(" ").slice(1).join(" ")}
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {p ? `${p.pontos} pts` : "ainda sem pontos"}
                {p && p.nomes.length > 1 ? ` · ${p.nomes.join(", ")}` : ""}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
