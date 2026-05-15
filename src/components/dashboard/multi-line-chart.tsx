"use client";

import * as React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type User = { id: string; nome: string };
type Snap = {
  user_id: string;
  rodada_label: string;
  rodada_ordem: number;
  posicao: number;
  pontos_rodada: number;
  pontos_totais: number;
};

// Paleta de cores variadas para diferenciar até ~30 linhas
const PALETTE = [
  "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#A855F7", "#EC4899",
  "#06B6D4", "#84CC16", "#F97316", "#8B5CF6", "#14B8A6", "#F43F5E",
  "#22D3EE", "#EAB308", "#6366F1", "#D946EF", "#0EA5E9", "#22C55E",
  "#FB923C", "#A78BFA", "#F472B6", "#4ADE80", "#FCD34D", "#60A5FA",
  "#F87171", "#C084FC", "#38BDF8", "#FACC15", "#34D399", "#FB7185",
];

export function MultiLineChart({ users, snapshots }: { users: User[]; snapshots: Snap[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Sem dados de rodadas ainda — quando a Copa começar, aparece aqui.
      </div>
    );
  }

  const rodadas = Array.from(
    new Map(snapshots.map((s) => [s.rodada_ordem, s.rodada_label])).entries(),
  ).sort(([a], [b]) => a - b);

  // Transforma em formato wide: [{ rodada: "Grupos R1", User1: 5, User2: 12, … }, ...]
  const data = rodadas.map(([ordem, label]) => {
    const row: Record<string, string | number> = { rodada: label };
    for (const u of users) {
      const snap = snapshots.find((s) => s.rodada_ordem === ordem && s.user_id === u.id);
      if (snap) row[u.id] = snap.posicao;
    }
    return row;
  });

  const maxPos = users.length || 30;
  const userMap = new Map(users.map((u) => [u.id, u.nome]));

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="rodada"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            reversed
            domain={[1, maxPos]}
            allowDecimals={false}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}º`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value: number, name: string) => {
              const userId = name;
              const userName = userMap.get(userId) ?? userId;
              const ord = data.findIndex((d) => d[userId] === value);
              const snap = snapshots.find((s) => s.user_id === userId && s.rodada_ordem === ord + 1);
              return [`${value}º — ${snap?.pontos_totais ?? 0} pts (+${snap?.pontos_rodada ?? 0} na rodada)`, userName];
            }}
          />
          {users.map((u, i) => (
            <Line
              key={u.id}
              type="monotone"
              dataKey={u.id}
              name={u.id}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
