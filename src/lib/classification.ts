/**
 * Classificação para o mata-mata da Copa 2026 — regulamento FIFA (Art. 19).
 *
 * Critérios de desempate na fase de grupos (DENTRO de cada grupo):
 *  1) Maior número de pontos
 *  2) Confronto direto — pontos nos jogos entre os times empatados
 *  3) Confronto direto — saldo de gols entre os empatados
 *  4) Confronto direto — gols marcados entre os empatados
 *     (reaplica 2-4 caso reste empate entre um subconjunto)
 *  5) Saldo de gols em todas as partidas do grupo
 *  6) Gols marcados em todas as partidas do grupo
 *  7) Fair play
 *  8) Ranking FIFA
 *  (no bolão, 7-8 são substituídos por desempate estável via time_id)
 *
 * Para os 8 melhores 3ºs colocados (entre os 12 grupos): o confronto direto
 * NÃO se aplica (são times de grupos diferentes). Ordena por:
 *  pontos → saldo geral → gols pró geral → time_id.
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

/**
 * Mini-tabela de confronto direto: pra um grupo de N times empatados em
 * pontos, retorna {pts, saldo, gp} de cada um considerando APENAS os jogos
 * entre eles próprios.
 */
function calcularMiniTabela(
  bloco: StatsTime[],
  jogosDoGrupo: JogoFinalizado[],
): Map<string, { pts: number; saldo: number; gp: number }> {
  const ids = new Set(bloco.map((t) => t.time_id));
  const mini = new Map<string, { pts: number; saldo: number; gp: number }>();
  for (const t of bloco) mini.set(t.time_id, { pts: 0, saldo: 0, gp: 0 });

  for (const j of jogosDoGrupo) {
    if (!ids.has(j.time_casa_id) || !ids.has(j.time_fora_id)) continue;
    const casa = mini.get(j.time_casa_id)!;
    const fora = mini.get(j.time_fora_id)!;
    casa.gp += j.placar_casa;
    casa.saldo += j.placar_casa - j.placar_fora;
    fora.gp += j.placar_fora;
    fora.saldo += j.placar_fora - j.placar_casa;
    if (j.placar_casa > j.placar_fora) casa.pts += 3;
    else if (j.placar_casa < j.placar_fora) fora.pts += 3;
    else {
      casa.pts += 1;
      fora.pts += 1;
    }
  }
  return mini;
}

/**
 * Desempata um bloco de times com a MESMA pontuação no grupo.
 * Aplica mini-tabela (pts h2h → saldo h2h → gp h2h) e, se persistir empate
 * entre um SUBCONJUNTO de 2+ times, RE-aplica a mini-tabela apenas entre
 * esses (regulamento FIFA Art. 19, item "reaplica 2-4 caso reste empate").
 * Só depois cai pros critérios gerais (saldo geral → gp geral → time_id).
 */
function desempatarBloco(
  bloco: StatsTime[],
  jogosDoGrupo: JogoFinalizado[],
): StatsTime[] {
  if (bloco.length === 1) return bloco;

  const mini = calcularMiniTabela(bloco, jogosDoGrupo);

  // 1ª passada: pts h2h → saldo h2h → gp h2h
  const ordenadoH2H = [...bloco].sort((a, b) => {
    const ma = mini.get(a.time_id)!;
    const mb = mini.get(b.time_id)!;
    if (mb.pts !== ma.pts) return mb.pts - ma.pts;
    if (mb.saldo !== ma.saldo) return mb.saldo - ma.saldo;
    if (mb.gp !== ma.gp) return mb.gp - ma.gp;
    return 0; // ainda empatados — vai pro próximo passo
  });

  // Reaplica em subconjuntos ainda empatados (após o h2h): se 2+ times
  // têm exatamente as mesmas (pts, saldo, gp) h2h, recalcula a mini só
  // entre eles. Se ainda empatar, vai pros critérios gerais.
  const resultado: StatsTime[] = [];
  let i = 0;
  while (i < ordenadoH2H.length) {
    let j = i;
    const refMini = mini.get(ordenadoH2H[i].time_id)!;
    while (
      j < ordenadoH2H.length &&
      mini.get(ordenadoH2H[j].time_id)!.pts === refMini.pts &&
      mini.get(ordenadoH2H[j].time_id)!.saldo === refMini.saldo &&
      mini.get(ordenadoH2H[j].time_id)!.gp === refMini.gp
    ) {
      j++;
    }
    const subBloco = ordenadoH2H.slice(i, j);
    if (subBloco.length === 1) {
      resultado.push(subBloco[0]);
    } else if (subBloco.length === bloco.length) {
      // Mini-tabela não desempatou nada — vai direto pros critérios gerais
      resultado.push(...ordenarPorCriteriosGerais(subBloco));
    } else {
      // Reaplica mini só com esses (jogos entre eles podem ser subconjunto
      // dos jogos do grupo, mas a mini desse subconjunto difere da mini
      // original em casos onde algum time do bloco original "absorveu"
      // pontos contra times agora excluídos).
      resultado.push(...desempatarBloco(subBloco, jogosDoGrupo));
    }
    i = j;
  }
  return resultado;
}

/** Critérios gerais (após esgotar o h2h): saldo geral → gp geral → time_id. */
function ordenarPorCriteriosGerais(bloco: StatsTime[]): StatsTime[] {
  return [...bloco].sort((a, b) => {
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    if (b.gols_pro !== a.gols_pro) return b.gols_pro - a.gols_pro;
    return a.time_id.localeCompare(b.time_id);
  });
}

/**
 * Ordena os times de um grupo segundo o regulamento FIFA 2026 (Art. 19).
 * Implementação por BLOCOS: agrupa por pontos; cada bloco com 2+ times é
 * desempatado por mini-tabela do confronto direto. Se persistir empate, cai
 * pros critérios gerais (saldo/gp geral, time_id).
 */
export function ordenarTimesDoGrupo(
  times: StatsTime[],
  jogosDoGrupo: JogoFinalizado[],
): StatsTime[] {
  // 1) ordena por pontos (desc) só pra formar os blocos
  const porPontos = [...times].sort((a, b) => b.pontos - a.pontos);

  const resultado: StatsTime[] = [];
  let i = 0;
  while (i < porPontos.length) {
    let j = i;
    while (j < porPontos.length && porPontos[j].pontos === porPontos[i].pontos) j++;
    const bloco = porPontos.slice(i, j);
    resultado.push(...desempatarBloco(bloco, jogosDoGrupo));
    i = j;
  }
  return resultado;
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
    const ordenado = ordenarTimesDoGrupo(times, jogosDoGrupo);
    if (ordenado.length < 4) continue;
    resultado.push({
      grupo,
      primeiro: ordenado[0],
      segundo: ordenado[1],
      terceiro: ordenado[2],
      quarto: ordenado[3],
    });
  }
  return resultado.sort((a, b) => a.grupo.localeCompare(b.grupo));
}

/**
 * Retorna os 32 classificados ao Round of 32:
 *  - 1º de cada grupo (12)
 *  - 2º de cada grupo (12)
 *  - 8 melhores 3ºs (entre os 12)
 *
 * Para os 12 terceiros, o confronto direto NÃO se aplica (são times de
 * grupos diferentes que nunca se enfrentaram). Ordena por:
 *   pontos → saldo geral → gols pró geral → time_id.
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

  // Ordena os 12 terceiros pelo mesmo critério (sem h2h, pois são de grupos diferentes)
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
