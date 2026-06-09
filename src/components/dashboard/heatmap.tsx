"use client";

import { formatShortName } from "@/lib/format-name";

type User = { id: string; nome: string };
type Snap = { user_id: string; rodada_label: string; rodada_ordem: number; pontos_rodada: number };

export function Heatmap({ users, snapshots }: { users: User[]; snapshots: Snap[] }) {
  if (snapshots.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem rodadas ainda.</p>;
  }

  const rodadas = Array.from(
    new Map(snapshots.map((s) => [s.rodada_ordem, s.rodada_label])).entries(),
  ).sort(([a], [b]) => a - b);

  // Gradiente POR COLUNA (rodada): cada coluna é normalizada pelo SEU próprio
  // máximo — o maior pontuador da R1 fica verde escuro e o menor claro, e a
  // mesma escala se repete em cada coluna, independente das outras. Antes era
  // um único máximo global, então colunas "caras" (ex.: Final, 128 pts)
  // achatavam o contraste das "baratas" (R1, máx 65) → quase tudo claro.
  const maxPorRodada = new Map<number, number>();
  for (const s of snapshots) {
    const atual = maxPorRodada.get(s.rodada_ordem) ?? 0;
    if (s.pontos_rodada > atual) maxPorRodada.set(s.rodada_ordem, s.pontos_rodada);
  }

  function color(pts: number, ord: number) {
    const cmax = maxPorRodada.get(ord) ?? 0;
    const ratio = cmax > 0 ? pts / cmax : 0; // coluna inteira zerada → tudo claro
    const alpha = 0.1 + ratio * 0.85;
    return `rgba(16, 185, 129, ${alpha})`;
  }

  const totaisPorUser = new Map<string, number>();
  for (const s of snapshots) {
    totaisPorUser.set(s.user_id, (totaisPorUser.get(s.user_id) ?? 0) + s.pontos_rodada);
  }
  const usersOrdenados = [...users].sort(
    (a, b) => (totaisPorUser.get(b.id) ?? 0) - (totaisPorUser.get(a.id) ?? 0),
  );

  return (
    <div
      className="-mx-5 overflow-x-auto overflow-y-visible scrollbar-thin px-5"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full border-collapse text-xs" style={{ minWidth: 380 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white p-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Nome
            </th>
            {rodadas.map(([, label]) => {
              const prefixo = label === "Final" ? "🏆 " : label === "Artilheiro" ? "👟 " : "";
              return (
                <th
                  key={label}
                  className="p-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  style={{ minWidth: 48 }}
                >
                  {prefixo}
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {usersOrdenados.map((u) => (
            <tr key={u.id}>
              <td className="sticky left-0 z-10 bg-white p-1.5 text-xs font-bold">
                {formatShortName(u.nome)}
              </td>
              {rodadas.map(([ord]) => {
                const snap = snapshots.find((s) => s.rodada_ordem === ord && s.user_id === u.id);
                const pts = snap?.pontos_rodada ?? 0;
                return (
                  <td
                    key={ord}
                    className="border border-border/20 p-1.5 text-center font-mono font-bold"
                    style={{ backgroundColor: color(pts, ord), minWidth: 48 }}
                    title={`${u.nome}: ${pts} pts`}
                  >
                    {pts}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
