"use client";

type User = { id: string; nome: string };
type Snap = { user_id: string; rodada_label: string; rodada_ordem: number; pontos_rodada: number };

export function Heatmap({ users, snapshots }: { users: User[]; snapshots: Snap[] }) {
  if (snapshots.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem rodadas ainda.</p>;
  }

  const rodadas = Array.from(
    new Map(snapshots.map((s) => [s.rodada_ordem, s.rodada_label])).entries(),
  ).sort(([a], [b]) => a - b);

  const max = Math.max(...snapshots.map((s) => s.pontos_rodada), 1);

  function color(pts: number) {
    const ratio = pts / max;
    const alpha = 0.1 + ratio * 0.85;
    return `rgba(16, 185, 129, ${alpha})`;
  }

  // Ordena users pelo total — mais pontos no topo
  const totaisPorUser = new Map<string, number>();
  for (const s of snapshots) {
    totaisPorUser.set(s.user_id, (totaisPorUser.get(s.user_id) ?? 0) + s.pontos_rodada);
  }
  const usersOrdenados = [...users].sort(
    (a, b) => (totaisPorUser.get(b.id) ?? 0) - (totaisPorUser.get(a.id) ?? 0),
  );

  return (
    <div className="overflow-auto scrollbar-thin">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card p-1.5 text-left font-medium text-muted-foreground">
              Participante
            </th>
            {rodadas.map(([, label]) => (
              <th key={label} className="p-1.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usersOrdenados.map((u) => (
            <tr key={u.id}>
              <td className="sticky left-0 z-10 bg-card p-1.5 font-medium">
                {u.nome.split(" ").slice(0, 2).join(" ")}
              </td>
              {rodadas.map(([ord]) => {
                const snap = snapshots.find((s) => s.rodada_ordem === ord && s.user_id === u.id);
                const pts = snap?.pontos_rodada ?? 0;
                return (
                  <td
                    key={ord}
                    className="border border-border/20 p-1.5 text-center font-mono"
                    style={{ backgroundColor: color(pts) }}
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
