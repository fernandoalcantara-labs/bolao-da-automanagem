"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

export function BarChartRodada({ data }: { data: { nome: string; pontos: number }[] }) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem pontos nesta rodada ainda.</p>;
  }

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 70, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
          <YAxis
            dataKey="nome"
            type="category"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            width={70}
            tickFormatter={(v) => (v as string).split(" ")[0]}
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
