"use client";

import * as React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TOP_N_GRAFICO } from "@/lib/config-display";
import { formatRankingName } from "@/lib/format-name";

type User = { id: string; nome: string };
type Snap = {
  user_id: string;
  rodada_label: string;
  rodada_ordem: number;
  posicao: number;
  pontos_rodada: number;
  pontos_totais: number;
};

// Paleta de cores variadas para diferenciar até ~16 linhas
const PALETTE = [
  "#10B981", "#3B82F6", "#A855F7", "#EC4899", "#06B6D4", "#84CC16",
  "#8B5CF6", "#14B8A6", "#F43F5E", "#22D3EE", "#6366F1", "#D946EF",
  "#0EA5E9", "#22C55E", "#A78BFA",
];

const COR_USUARIO_LOGADO = "#FF6B35"; // laranja Claude — destaque
const COR_LIDER = "#FFD60A"; // dourado pra 1º lugar

export function MultiLineChart({
  users,
  snapshots,
  currentUserId,
}: {
  users: User[];
  snapshots: Snap[];
  currentUserId?: string | null;
}) {
  if (snapshots.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Sem dados de rodadas ainda — quando a Copa começar, aparece aqui.
      </div>
    );
  }

  // Acha a última rodada (mais recente) pra ranquear os users
  const ultimaOrdem = Math.max(...snapshots.map((s) => s.rodada_ordem));
  const ranking = users
    .map((u) => {
      const ultima = snapshots.find((s) => s.rodada_ordem === ultimaOrdem && s.user_id === u.id);
      return { ...u, pontos: ultima?.pontos_totais ?? 0, posicao: ultima?.posicao ?? 99 };
    })
    .sort((a, b) => a.posicao - b.posicao);

  // Top N + usuário logado (se estiver fora)
  const topN = ranking.slice(0, TOP_N_GRAFICO);
  const usuarioLogadoNoTop = currentUserId
    ? topN.some((u) => u.id === currentUserId)
    : false;
  const usuarioForaDoTop =
    currentUserId &&
    !usuarioLogadoNoTop &&
    ranking.find((u) => u.id === currentUserId);

  const exibidos = usuarioForaDoTop ? [...topN, usuarioForaDoTop] : topN;
  const liderId = topN[0]?.id;

  const rodadas = Array.from(
    new Map(snapshots.map((s) => [s.rodada_ordem, s.rodada_label])).entries(),
  ).sort(([a], [b]) => a - b);

  // Wide format pra Recharts
  const data = rodadas.map(([ordem, label]) => {
    const row: Record<string, string | number> = { rodada: label };
    for (const u of exibidos) {
      const snap = snapshots.find((s) => s.rodada_ordem === ordem && s.user_id === u.id);
      if (snap) row[u.id] = snap.posicao;
    }
    return row;
  });

  const maxPos = ranking.length || 30;
  // Nome no tooltip: "Primeiro Último" (ou completo se ≤20 chars).
  // Desambigua dois "Fernando" sem precisar olhar avatar.
  const userMap = new Map(exibidos.map((u) => [u.id, formatRankingName(u.nome)]));

  return (
    <div className="space-y-2">
      <div className="h-[420px] w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="rodada"
              stroke="hsl(var(--muted-foreground))"
              tick={(props: any) => {
                const { x, y, payload } = props;
                const isArtilheiro = payload?.value === "Artilheiro";
                return (
                  <text
                    x={x}
                    y={y + 12}
                    textAnchor="middle"
                    fill={isArtilheiro ? "#FF9F1C" : "hsl(var(--muted-foreground))"}
                    fontSize={11}
                    fontWeight={isArtilheiro ? 800 : 400}
                  >
                    {isArtilheiro ? "🏆 " : ""}{payload?.value}
                  </text>
                );
              }}
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
                const snap = snapshots.find(
                  (s) => s.user_id === userId && s.rodada_ordem === ord + 1,
                );
                const isMe = currentUserId === userId ? " (Você)" : "";
                return [
                  `${value}º — ${snap?.pontos_totais ?? 0} pts (+${snap?.pontos_rodada ?? 0} na rodada)`,
                  userName + isMe,
                ];
              }}
            />
            {/* Linha vertical pontilhada separando a Final do Artilheiro */}
            {rodadas.some(([ord]) => ord === 9) && (
              <ReferenceLine
                x="Final"
                stroke="#FF9F1C"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            {exibidos.map((u, i) => {
              const isMe = currentUserId === u.id;
              const isLider = u.id === liderId;
              const stroke = isMe
                ? COR_USUARIO_LOGADO
                : isLider
                  ? COR_LIDER
                  : PALETTE[i % PALETTE.length];
              const strokeWidth = isMe ? 3.5 : isLider ? 2.5 : 1.5;
              return (
                <Line
                  key={u.id}
                  type="monotone"
                  dataKey={u.id}
                  name={u.id}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  dot={{ r: isMe ? 4 : 3 }}
                  activeDot={{ r: isMe ? 6 : 5 }}
                  isAnimationActive
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Aviso quando user logado está fora do top N */}
      {usuarioForaDoTop && (
        <div className="rounded-xl border-2 border-festive-orange/30 bg-festive-orange/10 p-2 text-center text-xs font-bold">
          🎯 Mostrando top {TOP_N_GRAFICO}. Você (
          <span className="text-festive-orange">{formatRankingName(usuarioForaDoTop.nome)}</span>) está em{" "}
          {usuarioForaDoTop.posicao}º com {usuarioForaDoTop.pontos} pts. 💪 Bora subir!
        </div>
      )}
    </div>
  );
}
