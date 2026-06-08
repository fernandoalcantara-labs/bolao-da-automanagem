"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PALETTE = ["#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#A855F7", "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#8B5CF6"];

/**
 * Agrupa por contagem. Ignora entradas com id/nome nulo, vazio ou "null"
 * (lixo de palpite órfão) — não viram fatia "null (1)" no donut. (53B)
 */
function agruparPorContagem<T extends string>(ids: T[], nomes: Record<T, string>) {
  const map = new Map<string, number>();
  for (const id of ids) {
    if (id == null || String(id).trim() === "") continue;
    const bruto = nomes[id];
    const nome = (bruto ?? "").trim();
    if (nome === "" || nome.toLowerCase() === "null" || nome.toLowerCase() === "undefined") continue;
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

const RAD = Math.PI / 180;

function ellipsis(s: string, max = 16): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Label radial (53A): fora do donut, com quebra por palavra pra nomes
 * compostos (ex.: "Kylian" / "Mbappé (4)") e âncora por lado (cresce pra
 * fora do centro). Ellipsis como rede de segurança.
 */
function renderLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  const r = outerRadius + 14;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const anchor = x > cx + 8 ? "start" : x < cx - 8 ? "end" : "middle";

  const palavras = String(name).trim().split(/\s+/);
  let linhas: string[];
  if (palavras.length <= 1) {
    linhas = [ellipsis(`${name} (${value})`)];
  } else {
    linhas = [ellipsis(palavras[0]), ellipsis(`${palavras.slice(1).join(" ")} (${value})`)];
  }

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill="hsl(var(--foreground))"
      fontSize={11}
      fontWeight={600}
    >
      {linhas.map((linha, i) => (
        <tspan key={i} x={x} dy={i === 0 ? (linhas.length > 1 ? "-0.3em" : "0.35em") : "1.1em"}>
          {linha}
        </tspan>
      ))}
    </text>
  );
}

function PieGeneric({ data, emptyMsg }: { data: { name: string; value: number }[]; emptyMsg: string }) {
  if (data.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMsg}</p>;
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={46}
            outerRadius={78}
            dataKey="value"
            paddingAngle={2}
            label={renderLabel}
            labelLine={false}
            isAnimationActive={false}
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
