import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Team = { id: string; nome: string; grupo: string; tbd: boolean };

export function IntegridadeReport({ teams }: { teams: Team[] }) {
  const total = teams.length;
  const porGrupo = new Map<string, number>();
  for (const t of teams) porGrupo.set(t.grupo, (porGrupo.get(t.grupo) ?? 0) + 1);

  const gruposCompletos = [...porGrupo.entries()].filter(([, n]) => n === 4).length;
  const tbdRestantes = teams.filter((t) => t.tbd).length;
  const tudoOk = total === 48 && gruposCompletos === 12 && tbdRestantes === 0;

  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        {tudoOk ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        )}
        <div className="flex-1 space-y-1.5 text-sm">
          <p className="font-semibold">Verificação de integridade</p>
          <ul className="text-muted-foreground">
            <li className="flex items-center gap-2">
              {total === 48 ? "✅" : "⚠️"} Total de seleções: <strong className="text-foreground">{total}/48</strong>
            </li>
            <li className="flex items-center gap-2">
              {gruposCompletos === 12 ? "✅" : "⚠️"} Grupos completos (4 times):{" "}
              <strong className="text-foreground">{gruposCompletos}/12</strong>
            </li>
            <li className="flex items-center gap-2">
              {tbdRestantes === 0 ? "✅" : "⚠️"} Seleções TBD pendentes:{" "}
              <strong className="text-foreground">{tbdRestantes}</strong>
            </li>
          </ul>
          {!tudoOk && (
            <p className="mt-2 text-xs">
              Ajuste os dados na tabela abaixo para corrigir a integridade.
            </p>
          )}
        </div>
        {tudoOk && <Badge variant="success">Tudo certo</Badge>}
      </CardContent>
    </Card>
  );
}
