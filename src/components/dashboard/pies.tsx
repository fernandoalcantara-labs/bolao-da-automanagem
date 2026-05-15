"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const PALETTE = ["#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#A855F7", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#8B5CF6"];

function agruparPorContagem<T extends string>(ids: T[], nomes: Record<T, string>) {
  const map = new Map<string, number>();
  for (const id of ids) {
    const nome = nomes[id] ?? id;
    map.set(nome, (map.get(nome) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function PieCampeao({ palpites, teams }: { palpites: string[]; teams: Record<string, string> }) {
  const data = agruparPorContagem(palpites, teams);
  return <PieGeneric data={data} emptyMsg="Sem palpites de campeão ainda." />;
}

export function PieArtilheiro({ palpites, players }: { palpites: string[]; players: Record<string, string> }) {
  const data = agruparPorContagem(palpites, players);
  return <PieGeneric data={data} emptyMsg="Sem palpites de artilheiro ainda." />;
}

function PieGeneric({ data, emptyMsg }: { data: { name: string; value: number }[]; emptyMsg: string }) {
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMsg}</p>;
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            dataKey="value"
            paddingAngle={2}
            label={(d) => `${d.name} (${d.value})`}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
