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
              const isArtilheiro = label === "Artilheiro";
              return (
                <th
                  key={label}
                  className={
                    isArtilheiro
                      ? "border-l-2 border-festive-gold-dark p-1.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-festive-gold-dark"
                      : "p-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  }
                  style={{ minWidth: 48 }}
                  title={
                    isArtilheiro
                      ? "Pontos do artilheiro (24 pts por acerto) — só preenche após o fim da Copa"
                      : undefined
                  }
                >
                  {isArtilheiro ? "🏆 " : ""}
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
                {u.nome.split(" ")[0]}
              </td>
              {rodadas.map(([ord, label]) => {
                const snap = snapshots.find((s) => s.rodada_ordem === ord && s.user_id === u.id);
                const pts = snap?.pontos_rodada ?? 0;
                const isArtilheiro = label === "Artilheiro";
                return (
                  <td
                    key={ord}
                    className={
                      isArtilheiro
                        ? "border-l-2 border-festive-gold-dark/40 border-y border-border/20 p-1.5 text-center font-mono font-bold"
                        : "border border-border/20 p-1.5 text-center font-mono font-bold"
                    }
                    style={{ backgroundColor: color(pts), minWidth: 48 }}
                    title={`${u.nome}: ${pts} pts${isArtilheiro ? " · 🏆 artilheiro" : ""}`}
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
