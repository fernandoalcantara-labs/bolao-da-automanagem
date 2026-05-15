/**
 * Classificação para o mata-mata da Copa 2026 — regulamento FIFA.
 *
 * Critérios de desempate na fase de grupos (Art. 19):
 *  1) Maior número de pontos
 *  2) Saldo de gols
 *  3) Gols marcados (pró)
 *  4) Confronto direto (pontos no H2H)
 *  5) Saldo de gols no H2H
 *  6) Gols pró no H2H
 *  7) Fair play
 *  8) Sorteio FIFA
 *
 * Para os 8 melhores 3ºs colocados (NOVO na Copa 2026 — 12 grupos):
 *  Mesma cascata aplicada SOBRE OS 12 TERCEIROS.
 */

import type { Grupo } from "@/types/database";

export type StatsTime = {
  time_id: string;
  grupo: Grupo;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
  pontos: number;
};

export type JogoFinalizado = {
  grupo: Grupo;
  time_casa_id: string;
  time_fora_id: string;
  placar_casa: number;
  placar_fora: number;
};

export function calcularStatsGrupos(jogos: JogoFinalizado[]): StatsTime[] {
  const map = new Map<string, StatsTime>();

  function pega(id: string, grupo: Grupo): StatsTime {
    if (!map.has(id)) {
      map.set(id, {
        time_id: id,
        grupo,
        jogos: 0,
        vitorias: 0,
        empates: 0,
        derrotas: 0,
        gols_pro: 0,
        gols_contra: 0,
        saldo: 0,
        pontos: 0,
      });
    }
    return map.get(id)!;
  }

  for (const j of jogos) {
    const c = pega(j.time_casa_id, j.grupo);
    const f = pega(j.time_fora_id, j.grupo);
    c.jogos++; f.jogos++;
    c.gols_pro += j.placar_casa; c.gols_contra += j.placar_fora;
    f.gols_pro += j.placar_fora; f.gols_contra += j.placar_casa;
    if (j.placar_casa > j.placar_fora) {
      c.vitorias++; f.derrotas++; c.pontos += 3;
    } else if (j.placar_casa < j.placar_fora) {
      f.vitorias++; c.derrotas++; f.pontos += 3;
    } else {
      c.empates++; f.empates++; c.pontos++; f.pontos++;
    }
  }

  for (const s of map.values()) s.saldo = s.gols_pro - s.gols_contra;
  return [...map.values()];
}

function compararCascata(a: StatsTime, b: StatsTime, jogosDoGrupo: JogoFinalizado[]): number {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos;
  if (b.saldo !== a.saldo) return b.saldo - a.saldo;
  if (b.gols_pro !== a.gols_pro) return b.gols_pro - a.gols_pro;

  // Confronto direto entre A e B
  const h2h = jogosDoGrupo.filter(
    (j) =>
      (j.time_casa_id === a.time_id && j.time_fora_id === b.time_id) ||
      (j.time_casa_id === b.time_id && j.time_fora_id === a.time_id),
  );
  if (h2h.length > 0) {
    const pontosA = h2h.reduce((acc, j) => {
      const aCasa = j.time_casa_id === a.time_id;
      const ga = aCasa ? j.placar_casa : j.placar_fora;
      const gb = aCasa ? j.placar_fora : j.placar_casa;
      return acc + (ga > gb ? 3 : ga === gb ? 1 : 0);
    }, 0);
    const pontosB = h2h.reduce((acc, j) => {
      const bCasa = j.time_casa_id === b.time_id;
      const gb = bCasa ? j.placar_casa : j.placar_fora;
      const ga = bCasa ? j.placar_fora : j.placar_casa;
      return acc + (gb > ga ? 3 : ga === gb ? 1 : 0);
    }, 0);
    if (pontosB !== pontosA) return pontosB - pontosA;
  }

  // Estabilidade: por time_id (substitui fair-play/sorteio)
  return a.time_id.localeCompare(b.time_id);
}

export type ClassificacaoGrupo = {
  grupo: Grupo;
  primeiro: StatsTime;
  segundo: StatsTime;
  terceiro: StatsTime;
  quarto: StatsTime;
};

export function classificarPorGrupo(jogos: JogoFinalizado[]): ClassificacaoGrupo[] {
  const stats = calcularStatsGrupos(jogos);
  const porGrupo = new Map<Grupo, StatsTime[]>();
  for (const s of stats) {
    const arr = porGrupo.get(s.grupo) ?? [];
    arr.push(s);
    porGrupo.set(s.grupo, arr);
  }
  const resultado: ClassificacaoGrupo[] = [];
  for (const [grupo, times] of porGrupo) {
    const jogosDoGrupo = jogos.filter((j) => j.grupo === grupo);
    times.sort((a, b) => compararCascata(a, b, jogosDoGrupo));
    if (times.length < 4) continue;
    resultado.push({
      grupo,
      primeiro: times[0],
      segundo: times[1],
      terceiro: times[2],
      quarto: times[3],
    });
  }
  return resultado.sort((a, b) => a.grupo.localeCompare(b.grupo));
}

/**
 * Retorna os 32 classificados ao Round of 32:
 *  - 1º de cada grupo (12)
 *  - 2º de cada grupo (12)
 *  - 8 melhores 3ºs (entre os 12)
 */
export function classificadosParaMataMata(jogos: JogoFinalizado[]): {
  primeiros: StatsTime[];
  segundos: StatsTime[];
  terceirosClassificados: StatsTime[];
  terceirosEliminados: StatsTime[];
  todosClassificados: StatsTime[];
} {
  const classif = classificarPorGrupo(jogos);
  const primeiros = classif.map((c) => c.primeiro);
  const segundos = classif.map((c) => c.segundo);
  const terceiros = classif.map((c) => c.terceiro);

  // Ordena os 12 terceiros pelo mesmo critério (sem h2h, pois não houve)
  terceiros.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    if (b.gols_pro !== a.gols_pro) return b.gols_pro - a.gols_pro;
    return a.time_id.localeCompare(b.time_id);
  });

  const terceirosClassificados = terceiros.slice(0, 8);
  const terceirosEliminados = terceiros.slice(8);

  return {
    primeiros,
    segundos,
    terceirosClassificados,
    terceirosEliminados,
    todosClassificados: [...primeiros, ...segundos, ...terceirosClassificados],
  };
}
