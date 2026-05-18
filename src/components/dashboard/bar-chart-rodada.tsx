"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

export function BarChartRodada({ data }: { data: { nome: string; pontos: number }[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem pontos nesta rodada ainda.</p>;
  }

  return (
    <div className="h-[360px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
          <YAxis
            dataKey="nome"
            type="category"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            width={60}
            tickFormatter={(v) => {
              const s = v as string;
              const primeiro = s.split(" ")[0];
              return primeiro.length > 8 ? `${primeiro.slice(0, 7)}…` : primeiro;
            }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Bar dataKey="pontos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="pontos" position="right" style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
