"use client";

import * as React from "react";
import { Crown } from "lucide-react";
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
    .map((s) => ({ ...s, nome: userMap.get(s.user_id)?.nome ?? "—" }))
    .sort((a, b) => a.posicao - b.posicao);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-4xl">🏆</span>
        <p className="text-sm font-bold text-muted-foreground">
          Ainda sem ranking
        </p>
        <p className="text-xs text-muted-foreground">
          Quando a Copa começar, aparece aqui!
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[480px] space-y-2 overflow-auto scrollbar-thin pr-1">
      {rows.map((r) => {
        if (r.posicao === 1) {
          return (
            <div
              key={r.user_id}
              className="flex items-center gap-3 rounded-2xl border-2 border-festive-gold-dark/40 gradient-gold p-3 shadow-stack-gold"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-md">
                <Crown className="h-6 w-6 text-festive-gold-dark" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-900/70">
                  👑 1º Lugar
                </p>
                <p className="line-clamp-1 font-fredoka text-base font-extrabold text-zinc-900">
                  {r.nome}
                </p>
              </div>
              <div className="text-right">
                <p className="font-fredoka text-2xl font-extrabold leading-none text-zinc-900">
                  {r.pontos_totais}
                </p>
                <p className="text-[10px] font-bold text-zinc-900/70">pts</p>
              </div>
            </div>
          );
        }

        const medalha = r.posicao === 2 ? "🥈" : r.posicao === 3 ? "🥉" : null;
        return (
          <div
            key={r.user_id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:shadow-stack",
              r.posicao === 2 && "border-zinc-300",
              r.posicao === 3 && "border-orange-400/40",
              r.posicao > 3 && "border-border",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold",
                r.posicao === 2 && "bg-zinc-200 text-zinc-700",
                r.posicao === 3 && "bg-orange-100 text-festive-orange",
                r.posicao > 3 && "bg-festive-blue/15 text-festive-blue",
              )}
            >
              {medalha ?? r.posicao}
            </div>
            <p className="line-clamp-1 flex-1 font-extrabold">{r.nome}</p>
            <div className="text-right">
              <p className="font-fredoka text-lg font-extrabold leading-none text-festive-green">
                {r.pontos_totais}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
