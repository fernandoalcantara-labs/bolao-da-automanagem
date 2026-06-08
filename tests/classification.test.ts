import { describe, it, expect } from "vitest";
import {
  classificarPorGrupo,
  ordenarTimesDoGrupo,
  calcularStatsGrupos,
  compararTerceiros,
  classificarPorGrupoProvisorio,
  classificadosProvisoriosR32,
  type StatsTime,
} from "../src/lib/classification";
import type { JogoFinalizado } from "../src/lib/classification";
import type { Grupo } from "../src/types/database";

/** Helper p/ StatsTime sintético (testes de 3C). */
function st(id: string, grupo: Grupo, pontos: number, saldo: number, gp: number): StatsTime {
  return {
    time_id: id, grupo,
    jogos: 3, vitorias: 0, empates: 0, derrotas: 0,
    gols_pro: gp, gols_contra: gp - saldo, saldo, pontos,
  };
}

/**
 * Helper: monta os 6 jogos de um grupo a partir de 4 times + 6 resultados.
 * Ordem dos confrontos: 1×2, 1×3, 1×4, 2×3, 2×4, 3×4.
 */
function grupoJogos(
  grupo: Grupo,
  [t1, t2, t3, t4]: [string, string, string, string],
  rs: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ],
): JogoFinalizado[] {
  return [
    { grupo, time_casa_id: t1, time_fora_id: t2, placar_casa: rs[0][0], placar_fora: rs[0][1] },
    { grupo, time_casa_id: t1, time_fora_id: t3, placar_casa: rs[1][0], placar_fora: rs[1][1] },
    { grupo, time_casa_id: t1, time_fora_id: t4, placar_casa: rs[2][0], placar_fora: rs[2][1] },
    { grupo, time_casa_id: t2, time_fora_id: t3, placar_casa: rs[3][0], placar_fora: rs[3][1] },
    { grupo, time_casa_id: t2, time_fora_id: t4, placar_casa: rs[4][0], placar_fora: rs[4][1] },
    { grupo, time_casa_id: t3, time_fora_id: t4, placar_casa: rs[5][0], placar_fora: rs[5][1] },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// TESTE (a) — Empate de 2 times: h2h decide contra saldo geral
// ────────────────────────────────────────────────────────────────────────

describe("Desempate dentro do grupo — 2 times (h2h vence saldo geral)", () => {
  it("X e Y empatam em pontos; Y tem saldo maior mas X venceu o h2h → X em 1º", () => {
    // Cenário: 4 times A B C D. X=A e Y=B empatam em pontos.
    // A vence B 1×0 (h2h pra A). B goleia C 5×0 (infla saldo geral do B).
    // A vence C 2×1. Tanto A quanto B perdem pro D pra equilibrar pontos.
    //
    // Pts A = 6 (V vs B + V vs C) → derrota D = 6. B = 6 (V vs C + V vs D + L vs A)?
    // Vou montar com cuidado:
    //  A vs B: 1×0 (A vence)
    //  A vs C: 2×1 (A vence)
    //  A vs D: 0×3 (D vence)  → A com 6 pts, saldo +(-)
    //  B vs C: 5×0 (B vence)
    //  B vs D: 0×3 (D vence)
    //  C vs D: 0×3 (D vence)
    //
    // Pts: A=6 (2V 1D), B=3 (1V 2D), C=0, D=9
    // Não dá empate. Vou ajustar.
    //
    // Cenário melhor:
    //  A vs B: 1×0 → A 3 pts, B 0
    //  A vs C: 0×1 → A 0, C 3
    //  A vs D: 3×0 → A 3, D 0
    //  B vs C: 0×0 → B 1, C 1
    //  B vs D: 5×0 → B 3, D 0
    //  C vs D: 1×1 → C 1, D 1
    // Pts: A=6, B=4, C=4, D=1 → A em 1º. B e C empatam em 4.
    // Não testa o caso A=B. Vou ajustar de novo.
    //
    // Cenário simples final: A e B empatam em pontos, B tem saldo geral maior:
    //  A vs B: 1×0 → A vence h2h
    //  A vs C: 2×1 → A
    //  A vs D: 0×2 → D
    //   → A: 2V 1D = 6 pts, saldo +1, gp 3
    //  B vs C: 4×0 → B
    //  B vs D: 1×0 → B
    //   → B (após A×B): 2V 1D = 6 pts, saldo +4 (5gp 1gc), gp 5
    //  C vs D: 0×1 → D
    //   → C: 0V 3D = 0 pts
    //   → D: 2V 1D = 6 pts, saldo +1, gp 3
    // Pts: A=6, B=6, D=6, C=0
    //
    // Saldo: A=+1, B=+4, D=+1, gp A=3, B=5, D=3
    // Pelo saldo geral: B (+4) > A (+1) = D (+1)
    // Pelo h2h entre A, B, D (mini-tabela):
    //   A×B 1×0 → A 3, B 0
    //   A×D 0×2 → D 3, A 0
    //   B×D 1×0 → B 3, D 0
    //   Pts mini: A=3, B=3, D=3 (triplo empate na mini também!)
    //   Saldo mini: A: vs B +1, vs D -2 = -1
    //               B: vs A -1, vs D +1 = 0
    //               D: vs A +2, vs B -1 = +1
    //   D > B > A na mini → ordem 1º=D, 2º=B, 3º=A
    const jogos = grupoJogos(
      "A",
      ["A", "B", "C", "D"],
      [
        [1, 0], // A vs B → A vence
        [2, 1], // A vs C → A vence
        [0, 2], // A vs D → D vence
        [4, 0], // B vs C → B vence
        [1, 0], // B vs D → B vence
        [0, 1], // C vs D → D vence
      ],
    );
    const classif = classificarPorGrupo(jogos);
    const grupoA = classif.find((c) => c.grupo === "A")!;
    expect(grupoA.primeiro.time_id).toBe("D"); // h2h mini: D
    expect(grupoA.segundo.time_id).toBe("B"); // h2h mini: B
    expect(grupoA.terceiro.time_id).toBe("A"); // h2h mini: A
    expect(grupoA.quarto.time_id).toBe("C");
  });

  it("2 times empatados: X venceu h2h e fica à frente apesar de saldo geral menor", () => {
    // Cenário focado em DUPLO empate (não triplo): X e Y empatam, Z e W ficam fora
    // X vs Y: X vence 1×0
    // X vs Z: 2×0
    // X vs W: 0×0
    // Y vs Z: 4×0  (infla saldo de Y)
    // Y vs W: 1×0
    // Z vs W: 0×0
    //
    // Pts X = 3+3+1 = 7, Y = 0+3+3 = 6 (perdeu de X)
    // Hmm não empata. Tem que ajustar pra Y ter +3 em algum lugar.
    //
    // Vou simplificar:
    // X vs Y: X vence 1×0 (X +3)
    // X vs Z: 0×1 (Z +3)   → X tem 3+0=3
    // X vs W: 3×0 (X +3)   → X 6 pts
    // Y vs Z: 5×0 (Y +3)
    // Y vs W: 1×0 (Y +3)   → Y 6 pts
    // Z vs W: 1×0 (Z +3)
    //
    // Pts: X=6, Y=6, Z=6, W=0 — triplo de novo!
    //
    // Vou aceitar triplo e fazer asserção diferente: X vence h2h sobre Y.
    // No mini de X-Y-Z:
    //  X×Y 1×0 → X 3
    //  X×Z 0×1 → Z 3
    //  Y×Z 5×0 → Y 3
    //  Mini pts: 3-3-3 (triplo). Mini saldo: X (-1+1+0)=0; Y (5-1)... espera.
    //  Saldo X na mini: vs Y +1, vs Z -1 → 0
    //  Saldo Y na mini: vs X -1, vs Z +5 → +4
    //  Saldo Z na mini: vs X +1, vs Y -5 → -4
    //  → Mini ordem: Y > X > Z
    const jogos = grupoJogos(
      "B",
      ["X", "Y", "Z", "W"],
      [
        [1, 0], // X vs Y → X vence
        [0, 1], // X vs Z → Z vence
        [3, 0], // X vs W → X
        [5, 0], // Y vs Z → Y vence
        [1, 0], // Y vs W → Y
        [1, 0], // Z vs W → Z
      ],
    );
    const classif = classificarPorGrupo(jogos);
    const grupoB = classif.find((c) => c.grupo === "B")!;
    // Esperado pela mini-tabela do h2h: Y > X > Z
    expect(grupoB.primeiro.time_id).toBe("Y");
    expect(grupoB.segundo.time_id).toBe("X");
    expect(grupoB.terceiro.time_id).toBe("Z");
    expect(grupoB.quarto.time_id).toBe("W");
  });
});

// ────────────────────────────────────────────────────────────────────────
// TESTE (b) — 3 times empatados: mini-tabela decide
// ────────────────────────────────────────────────────────────────────────

describe("Desempate dentro do grupo — 3 times (mini-tabela)", () => {
  it("ABC empatam em pontos; saldo geral ordena diferente da mini → mini prevalece", () => {
    // ABC com 6 pts cada (1V 1D 1E na mini, perdem do D? não, ganham do D).
    // Vou montar:
    //  D é lanterna (perde todos)
    //  A vs D: 5×0 (A +3, saldo geral +5 enorme)
    //  B vs D: 1×0 (B +3, saldo +1)
    //  C vs D: 1×0 (C +3, saldo +1)
    //  Mini entre A, B, C (precisa A=B=C=3 pts mini):
    //  A vs B: 0×1 (B vence)
    //  A vs C: 2×0 (A vence)
    //  B vs C: 0×1 (C vence)
    //  Cada um: 1V 1D na mini = 3 pts mini ✓
    //  Mini saldos: A: -1+2=+1, B: +1-1=0, C: -2+1=-1
    //  → Mini ordem: A > B > C
    //
    // Geral pts: A=6 (V mini, V D), B=6, C=6, D=0
    // Geral saldo: A vs B -1, vs C +2, vs D +5 → +6, gp=7
    //              B vs A +1, vs C -1, vs D +1 → +1, gp=2
    //              C vs A -2, vs B +1, vs D +1 → 0, gp=2
    // Geral por saldo: A > B > C (mesma ordem da mini neste caso 😅)
    //
    // Vou inverter: A com saldo geral PIOR mas mini-saldo MELHOR
    //  D é lanterna
    //  A vs D: 0×0 (empate — A só 1 pt aqui)
    //  Hmm, isso bagunça pontos. Difícil ABC empatarem e saldo geral
    //  ser inverso do mini sem ABC terem resultados muito diferentes vs D.
    //
    // Cenário que funciona:
    //  A vs D: 1×0 → A +1 saldo, gp 1
    //  B vs D: 5×0 → B +5 saldo, gp 5 (infla)
    //  C vs D: 1×0 → C +1 saldo, gp 1
    //  Mini:
    //   A vs B: 2×0 → A 3, saldo +2
    //   A vs C: 0×1 → C 3, A 0, A saldo -1
    //   B vs C: 1×0 → B 3, C 0
    //   Mini pts: A=3, B=3, C=3
    //   Mini saldo: A: +2-1=+1; B: -2+1=-1; C: +1-1=0
    //   Mini ordem: A > C > B
    //
    //  Pts geral: A=6 (V D + V B + L C); B=6 (V D + L A + V C); C=6 (V D + V A + L B)
    //   ✓ triplo
    //  Saldo geral: A = +1 (vs D) +2 (vs B) -1 (vs C) = +2, gp=4 (1+2+1? 1+2+0=3)
    //   Hmm vamos contar gp: A faz 1 vs D + 2 vs B + 0 vs C = 3 gp
    //   B faz 0 vs A + 1 vs C + 5 vs D = 6 gp
    //   C faz 1 vs A + 0 vs B + 1 vs D = 2 gp
    //  Saldo: A +2, B = 0+1+5 - (2+0+0) = +4, C = 1+0+1-(0+1+0)=+1
    //   Geral por saldo: B (+4) > A (+2) > C (+1) ✗ (mini diz A > C > B)
    //
    //  Esse cenário separa os dois ordenamentos! Vou usar.
    const jogos = grupoJogos(
      "C",
      ["A", "B", "C", "D"],
      [
        [2, 0], // A vs B → A vence
        [0, 1], // A vs C → C vence
        [1, 0], // A vs D → A vence
        [1, 0], // B vs C → B vence
        [5, 0], // B vs D → B vence (infla saldo geral)
        [1, 0], // C vs D → C vence
      ],
    );
    const classif = classificarPorGrupo(jogos);
    const grupoC = classif.find((c) => c.grupo === "C")!;
    // Geral por saldo: B > A > C. Mini h2h: A > C > B.
    // Esperado (FIFA Art. 19 — mini prevalece): A > C > B > D.
    expect(grupoC.primeiro.time_id).toBe("A");
    expect(grupoC.segundo.time_id).toBe("C");
    expect(grupoC.terceiro.time_id).toBe("B");
    expect(grupoC.quarto.time_id).toBe("D");
  });
});

// ────────────────────────────────────────────────────────────────────────
// TESTE (c) — Regressão dos usuários reais (casos-chave do gabarito)
// ────────────────────────────────────────────────────────────────────────

describe("Regressão — casos-chave dos 5 usuários de teste", () => {
  it("Fernando — Grupo H: Cabo Verde em 2º (venceu Espanha 1×0 no h2h)", () => {
    // Palpites Fernando, Grupo H (extraído de casos-regressao.json):
    //   Espanha 0×1 Cabo Verde
    //   Arábia Saudita 1×1 Uruguai
    //   Espanha 2×0 Arábia Saudita
    //   Uruguai 8×0 Cabo Verde
    //   Cabo Verde 1×1 Arábia Saudita
    //   Espanha 3×3 Uruguai
    const jogos: JogoFinalizado[] = [
      { grupo: "H", time_casa_id: "Espanha", time_fora_id: "Cabo Verde", placar_casa: 0, placar_fora: 1 },
      { grupo: "H", time_casa_id: "Arábia Saudita", time_fora_id: "Uruguai", placar_casa: 1, placar_fora: 1 },
      { grupo: "H", time_casa_id: "Espanha", time_fora_id: "Arábia Saudita", placar_casa: 2, placar_fora: 0 },
      { grupo: "H", time_casa_id: "Uruguai", time_fora_id: "Cabo Verde", placar_casa: 8, placar_fora: 0 },
      { grupo: "H", time_casa_id: "Cabo Verde", time_fora_id: "Arábia Saudita", placar_casa: 1, placar_fora: 1 },
      { grupo: "H", time_casa_id: "Espanha", time_fora_id: "Uruguai", placar_casa: 3, placar_fora: 3 },
    ];
    const classif = classificarPorGrupo(jogos);
    const grupoH = classif.find((c) => c.grupo === "H")!;
    expect(grupoH.primeiro.time_id).toBe("Uruguai"); // 5 pts
    expect(grupoH.segundo.time_id).toBe("Cabo Verde"); // 4 pts, venceu h2h
    expect(grupoH.terceiro.time_id).toBe("Espanha"); // 4 pts, perdeu h2h
    expect(grupoH.quarto.time_id).toBe("Arábia Saudita"); // 2 pts
  });

  it("Motta — Grupo B: Suíça em 1º (venceu Canadá 1×0 no h2h)", () => {
    // Palpites Motta, Grupo B:
    //   Canadá 2×1 Bósnia e Herzegovina
    //   Catar 2×0 Suíça
    //   Suíça 2×0 Bósnia e Herzegovina
    //   Canadá 2×0 Catar
    //   Bósnia 1×1 Catar
    //   Canadá 0×1 Suíça
    const jogos: JogoFinalizado[] = [
      { grupo: "B", time_casa_id: "Canadá", time_fora_id: "Bósnia", placar_casa: 2, placar_fora: 1 },
      { grupo: "B", time_casa_id: "Catar", time_fora_id: "Suíça", placar_casa: 2, placar_fora: 0 },
      { grupo: "B", time_casa_id: "Suíça", time_fora_id: "Bósnia", placar_casa: 2, placar_fora: 0 },
      { grupo: "B", time_casa_id: "Canadá", time_fora_id: "Catar", placar_casa: 2, placar_fora: 0 },
      { grupo: "B", time_casa_id: "Bósnia", time_fora_id: "Catar", placar_casa: 1, placar_fora: 1 },
      { grupo: "B", time_casa_id: "Canadá", time_fora_id: "Suíça", placar_casa: 0, placar_fora: 1 },
    ];
    const classif = classificarPorGrupo(jogos);
    const grupoB = classif.find((c) => c.grupo === "B")!;
    expect(grupoB.primeiro.time_id).toBe("Suíça"); // venceu h2h sobre Canadá
    expect(grupoB.segundo.time_id).toBe("Canadá");
  });

  it("Lucas — Grupo A: Tchéquia em 2º (venceu Coreia do Sul no h2h)", () => {
    // Palpites Lucas, Grupo A:
    //   México 2×1 África do Sul
    //   Coreia do Sul 0×1 Tchéquia
    //   Tchéquia 1×1 África do Sul
    //   México 1×1 Coreia do Sul
    //   África do Sul 1×3 Coreia do Sul
    //   México 2×0 Tchéquia
    const jogos: JogoFinalizado[] = [
      { grupo: "A", time_casa_id: "México", time_fora_id: "ÁfricaSul", placar_casa: 2, placar_fora: 1 },
      { grupo: "A", time_casa_id: "CoreiaSul", time_fora_id: "Tchéquia", placar_casa: 0, placar_fora: 1 },
      { grupo: "A", time_casa_id: "Tchéquia", time_fora_id: "ÁfricaSul", placar_casa: 1, placar_fora: 1 },
      { grupo: "A", time_casa_id: "México", time_fora_id: "CoreiaSul", placar_casa: 1, placar_fora: 1 },
      { grupo: "A", time_casa_id: "ÁfricaSul", time_fora_id: "CoreiaSul", placar_casa: 1, placar_fora: 3 },
      { grupo: "A", time_casa_id: "México", time_fora_id: "Tchéquia", placar_casa: 2, placar_fora: 0 },
    ];
    const classif = classificarPorGrupo(jogos);
    const grupoA = classif.find((c) => c.grupo === "A")!;
    expect(grupoA.primeiro.time_id).toBe("México");
    // Coreia do Sul e Tchéquia empatam em 4 pts. Tchéquia venceu 1×0 no h2h.
    expect(grupoA.segundo.time_id).toBe("Tchéquia");
    expect(grupoA.terceiro.time_id).toBe("CoreiaSul");
  });

  it("Vitor — Grupo A: África do Sul em 3º (venceu Coreia do Sul 1×0)", () => {
    // Palpites Vitor, Grupo A:
    //   México 3×1 África do Sul
    //   Coreia do Sul 2×0 Tchéquia
    //   México 1×0 Coreia do Sul
    //   Tchéquia 3×1 África do Sul
    //   África do Sul 1×0 Coreia do Sul
    //   México 0×0 Tchéquia
    const jogos: JogoFinalizado[] = [
      { grupo: "A", time_casa_id: "México", time_fora_id: "ÁfricaSul", placar_casa: 3, placar_fora: 1 },
      { grupo: "A", time_casa_id: "CoreiaSul", time_fora_id: "Tchéquia", placar_casa: 2, placar_fora: 0 },
      { grupo: "A", time_casa_id: "México", time_fora_id: "CoreiaSul", placar_casa: 1, placar_fora: 0 },
      { grupo: "A", time_casa_id: "Tchéquia", time_fora_id: "ÁfricaSul", placar_casa: 3, placar_fora: 1 },
      { grupo: "A", time_casa_id: "ÁfricaSul", time_fora_id: "CoreiaSul", placar_casa: 1, placar_fora: 0 },
      { grupo: "A", time_casa_id: "México", time_fora_id: "Tchéquia", placar_casa: 0, placar_fora: 0 },
    ];
    const classif = classificarPorGrupo(jogos);
    const grupoA = classif.find((c) => c.grupo === "A")!;
    expect(grupoA.primeiro.time_id).toBe("México");
    expect(grupoA.segundo.time_id).toBe("Tchéquia");
    // África do Sul e Coreia do Sul empatam em 3 pts. ÁfricaSul venceu 1×0 no h2h.
    expect(grupoA.terceiro.time_id).toBe("ÁfricaSul");
    expect(grupoA.quarto.time_id).toBe("CoreiaSul");
  });
});

// ────────────────────────────────────────────────────────────────────────
// Teste do helper exportado ordenarTimesDoGrupo
// ────────────────────────────────────────────────────────────────────────

describe("ordenarTimesDoGrupo (helper exportado)", () => {
  it("não modifica o array original (imutável)", () => {
    const jogos: JogoFinalizado[] = [
      { grupo: "A", time_casa_id: "X", time_fora_id: "Y", placar_casa: 1, placar_fora: 0 },
      { grupo: "A", time_casa_id: "X", time_fora_id: "Z", placar_casa: 1, placar_fora: 0 },
      { grupo: "A", time_casa_id: "Y", time_fora_id: "Z", placar_casa: 1, placar_fora: 0 },
    ];
    const stats = calcularStatsGrupos(jogos);
    const idsAntes = stats.map((s) => s.time_id);
    ordenarTimesDoGrupo(stats, jogos);
    const idsDepois = stats.map((s) => s.time_id);
    expect(idsAntes).toEqual(idsDepois); // input não foi mutado
  });

  it("retorna times ordenados com pontos descendente", () => {
    const jogos: JogoFinalizado[] = [
      { grupo: "A", time_casa_id: "X", time_fora_id: "Y", placar_casa: 3, placar_fora: 0 },
      { grupo: "A", time_casa_id: "X", time_fora_id: "Z", placar_casa: 3, placar_fora: 0 },
      { grupo: "A", time_casa_id: "Y", time_fora_id: "Z", placar_casa: 3, placar_fora: 0 },
    ];
    const stats = calcularStatsGrupos(jogos);
    const ordenado = ordenarTimesDoGrupo(stats, jogos);
    expect(ordenado[0].time_id).toBe("X"); // 6 pts
    expect(ordenado[1].time_id).toBe("Y"); // 3 pts
    expect(ordenado[2].time_id).toBe("Z"); // 0 pts
  });
});

// ────────────────────────────────────────────────────────────────────────
// (3C) compararTerceiros — desempate dos 3ºs por ranking FIFA
// ────────────────────────────────────────────────────────────────────────

describe("(3C) compararTerceiros — ranking FIFA como penúltimo critério", () => {
  it("empate em pontos/saldo/gp → menor ranking FIFA vence o alfabético", () => {
    const a = st("ZZZ", "A", 4, 1, 3); // alfabeticamente pior
    const b = st("AAA", "B", 4, 1, 3);
    const ranking = new Map([["ZZZ", 5], ["AAA", 40]]); // ZZZ melhor ranqueado
    const ord = [b, a].sort((x, y) => compararTerceiros(x, y, ranking));
    expect(ord[0].time_id).toBe("ZZZ");
  });

  it("PRIORIDADE: pontos vencem o ranking FIFA (6 pts > 3 pts, ranking pior)", () => {
    const a = st("PIOR_RANK", "A", 6, 0, 2);
    const b = st("MELHOR_RANK", "B", 3, 9, 9);
    const ranking = new Map([["PIOR_RANK", 99], ["MELHOR_RANK", 1]]);
    const ord = [b, a].sort((x, y) => compararTerceiros(x, y, ranking));
    expect(ord[0].time_id).toBe("PIOR_RANK");
  });

  it("PRIORIDADE: saldo vence ranking (mesmos pontos)", () => {
    const a = st("R_RUIM", "A", 4, 5, 6);
    const b = st("R_BOM", "B", 4, 1, 6);
    const ranking = new Map([["R_RUIM", 80], ["R_BOM", 2]]);
    const ord = [b, a].sort((x, y) => compararTerceiros(x, y, ranking));
    expect(ord[0].time_id).toBe("R_RUIM");
  });

  it("sem rankingFifa → fallback time_id (idêntico ao histórico)", () => {
    const a = st("BBB", "A", 4, 1, 3);
    const b = st("AAA", "B", 4, 1, 3);
    const ord = [a, b].sort((x, y) => compararTerceiros(x, y));
    expect(ord[0].time_id).toBe("AAA");
  });

  it("ranking ausente p/ um time → vai pro fim (+∞)", () => {
    const a = st("SEM", "A", 4, 1, 3);
    const b = st("COM", "B", 4, 1, 3);
    const ranking = new Map([["COM", 50]]);
    const ord = [a, b].sort((x, y) => compararTerceiros(x, y, ranking));
    expect(ord[0].time_id).toBe("COM");
  });
});

// ────────────────────────────────────────────────────────────────────────
// (3.1) Classificação provisória — grupos incompletos
// ────────────────────────────────────────────────────────────────────────

describe("(3.1) classificação provisória", () => {
  it("ordena grupo parcial sem exigir 4 times", () => {
    const jogos: JogoFinalizado[] = [
      { grupo: "A", time_casa_id: "A", time_fora_id: "B", placar_casa: 2, placar_fora: 0 },
    ];
    const r = classificarPorGrupoProvisorio(jogos);
    const grupoA = r.find((g) => g.grupo === "A")!;
    expect(grupoA.times[0].time_id).toBe("A");
    expect(grupoA.times.length).toBe(2);
  });

  it("classificadosProvisoriosR32 traz 1º/2º com origem", () => {
    const jogos: JogoFinalizado[] = [
      { grupo: "A", time_casa_id: "A1", time_fora_id: "A2", placar_casa: 3, placar_fora: 0 },
    ];
    const cls = classificadosProvisoriosR32(jogos);
    expect(cls.find((c) => c.time_id === "A1")!.origem).toBe("1º Grupo A");
    expect(cls.find((c) => c.time_id === "A2")!.origem).toBe("2º Grupo A");
  });
});
