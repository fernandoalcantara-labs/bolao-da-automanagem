import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type TeamInfo = { nome: string; bandeira_url: string };
type Match = {
  id: string;
  fase: string;
  rodada: number | null;
  time_casa_id: string | null;
  time_fora_id: string | null;
  data_hora: string;
  status: "agendado" | "andamento" | "finalizado";
  placar_casa: number | null;
  placar_fora: number | null;
};

export function ConfrontosRodada({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Record<string, TeamInfo>;
}) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚽ Próximos confrontos</CardTitle>
        <CardDescription>Os jogos mais próximos no calendário.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => {
          const casa = m.time_casa_id ? teams[m.time_casa_id] : null;
          const fora = m.time_fora_id ? teams[m.time_fora_id] : null;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/60 p-3"
            >
              <div className="flex flex-1 items-center gap-2 text-right">
                <span className="line-clamp-1 flex-1 text-sm font-medium">{casa?.nome ?? "—"}</span>
                {casa && (
                  <Image src={casa.bandeira_url} alt={casa.nome} width={24} height={18} className="rounded-sm" unoptimized />
                )}
              </div>
              <div className="flex flex-col items-center text-xs">
                {m.status === "finalizado" ? (
                  <span className="font-mono font-bold text-primary">
                    {m.placar_casa} – {m.placar_fora}
                  </span>
                ) : (
                  <Badge variant={m.status === "andamento" ? "warning" : "muted"}>
                    {m.status === "andamento" ? "AO VIVO" : "vs"}
                  </Badge>
                )}
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDateTime(m.data_hora)}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-2">
                {fora && (
                  <Image src={fora.bandeira_url} alt={fora.nome} width={24} height={18} className="rounded-sm" unoptimized />
                )}
                <span className="line-clamp-1 flex-1 text-sm font-medium">{fora?.nome ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
