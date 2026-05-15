import { Users, DollarSign, Calendar, Crown, Flame, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";

type Props = {
  totalPagos: number;
  totalArrecadado: number;
  jogosFinalizados: number;
  totalJogos: number;
  liderNome: string;
  liderPontos: number;
  maiorPontuadorNome: string;
  maiorPontuadorPontos: number;
  ultimaLabel: string;
  mediaPontos: number;
};

export function KpiCards(p: Props) {
  const kpis = [
    {
      icon: Users,
      label: "Participantes pagos",
      value: p.totalPagos.toString(),
      hint: "no ranking público",
      color: "text-primary",
    },
    {
      icon: DollarSign,
      label: "Total arrecadado",
      value: formatCurrency(p.totalArrecadado),
      hint: "prêmio estimado",
      color: "text-emerald-400",
    },
    {
      icon: Calendar,
      label: "Jogos disputados",
      value: `${p.jogosFinalizados} / ${p.totalJogos}`,
      hint: `${p.totalJogos > 0 ? Math.round((p.jogosFinalizados / p.totalJogos) * 100) : 0}% da Copa`,
      color: "text-blue-400",
    },
    {
      icon: Crown,
      label: "Líder",
      value: p.liderNome.split(" ")[0],
      hint: `${p.liderPontos} pts`,
      color: "text-amber-400",
    },
    {
      icon: Flame,
      label: `Top ${p.ultimaLabel}`,
      value: p.maiorPontuadorNome.split(" ")[0],
      hint: `+${p.maiorPontuadorPontos} pts na rodada`,
      color: "text-orange-400",
    },
    {
      icon: BarChart3,
      label: "Média da rodada",
      value: p.mediaPontos.toString(),
      hint: "pts/participante",
      color: "text-violet-400",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <Card key={k.label} className="overflow-hidden">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {k.label}
              </span>
              <k.icon className={cn("h-4 w-4", k.color)} />
            </div>
            <p className="text-2xl font-bold leading-tight">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
