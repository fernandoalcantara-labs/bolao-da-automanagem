"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type User = { id: string; nome: string };
type Snap = {
  user_id: string;
  rodada_label: string;
  rodada_ordem: number;
  posicao: number;
  pontos_rodada: number;
  pontos_totais: number;
};

export function RankingTable({ users, snapshots }: { users: User[]; snapshots: Snap[] }) {
  const ultimaOrdem = snapshots.length
    ? Math.max(...snapshots.map((s) => s.rodada_ordem))
    : 0;
  const ultimas = snapshots.filter((s) => s.rodada_ordem === ultimaOrdem);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const rows = ultimas
    .map((s) => ({
      ...s,
      nome: userMap.get(s.user_id)?.nome ?? "—",
    }))
    .sort((a, b) => a.posicao - b.posicao);

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Ainda sem ranking. Aguarde o início da Copa!
      </p>
    );
  }

  return (
    <div className="max-h-[480px] overflow-auto scrollbar-thin">
      <Table>
        <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Participante</TableHead>
            <TableHead className="text-right">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.user_id}
              className={cn(
                r.posicao === 1 && "bg-amber-500/10",
                r.posicao === 2 && "bg-zinc-400/5",
                r.posicao === 3 && "bg-orange-700/10",
              )}
            >
              <TableCell className="font-mono font-semibold">
                {r.posicao === 1 ? "🥇" : r.posicao === 2 ? "🥈" : r.posicao === 3 ? "🥉" : r.posicao}
              </TableCell>
              <TableCell className="font-medium">{r.nome}</TableCell>
              <TableCell className="text-right font-mono font-bold text-primary">
                {r.pontos_totais}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
