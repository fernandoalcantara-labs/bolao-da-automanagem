import { describe, it, expect } from "vitest";
import {
  R32_PARES,
  lookupAnnexC,
  detectarEmpateTerceiros,
  ORIGEM_TERCEIRO_LABEL,
} from "../src/lib/bracket-2026";
import {
  R16,
  QF,
  SF,
  FINAL,
  R32_ESQUERDO_ORDEM,
  R32_DIREITO_ORDEM,
  labelJogo,
} from "../src/lib/mata-mata-estrutura";
import type { Grupo } from "../src/types/database";
import type { JogoFinalizado } from "../src/lib/classification";

// ────────────────────────────────────────────────────────────────────────
// Helper: gera todas as C(12,8) = 495 combinações de 8 grupos de A-L
// ────────────────────────────────────────────────────────────────────────

const TODOS_GRUPOS: Grupo[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function combinacoes<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...rest] = arr;
  return [
    ...combinacoes(rest, k - 1).map((c) => [head, ...c]),
    ...combinacoes(rest, k),
  ];
}

// ────────────────────────────────────────────────────────────────────────
// Grupos permitidos por slot do R32 (matches que recebem 3os)
// ────────────────────────────────────────────────────────────────────────

const GRUPOS_PERMITIDOS_POR_MATCH: Record<number, ReadonlySet<Grupo>> = {
  74: new Set(["A", "B", "C", "D", "F"] as Grupo[]), // 1E vs 3X
  77: new Set(["C", "D", "F", "G", "H"] as Grupo[]), // 1I vs 3X
  79: new Set(["C", "E", "F", "H", "I"] as Grupo[]), // 1A vs 3X
  80: new Set(["E", "H", "I", "J", "K"] as Grupo[]), // 1L vs 3X
  81: new Set(["B", "E", "F", "I", "J"] as Grupo[]), // 1D vs 3X
  82: new Set(["A", "E", "H", "I", "J"] as Grupo[]), // 1G vs 3X
  85: new Set(["E", "F", "G", "I", "J"] as Grupo[]), // 1B vs 3X
  87: new Set(["D", "E", "I", "J", "L"] as Grupo[]), // 1K vs 3X
};

// Match → grupo do 1º colocado que joga contra o 3º
const PRIMEIRO_DO_MATCH: Record<number, Grupo> = {
  74: "E", 77: "I", 79: "A", 80: "L",
  81: "D", 82: "G", 85: "B", 87: "K",
};

// ────────────────────────────────────────────────────────────────────────
// TESTES
// ────────────────────────────────────────────────────────────────────────

describe("Matriz Annex C — integridade", () => {
  it("R32_PARES tem 16 entradas com matchNumber único 73-88", () => {
    expect(R32_PARES.length).toBe(16);
    const nums = new Set(R32_PARES.map((p) => p.matchNumber));
    expect(nums.size).toBe(16);
    for (const n of nums) {
      expect(n).toBeGreaterThanOrEqual(73);
      expect(n).toBeLessThanOrEqual(88);
    }
  });

  it("cobre todas as 495 combinações C(12,8) sem lançar erro", () => {
    const todas = combinacoes(TODOS_GRUPOS, 8);
    expect(todas.length).toBe(495);
    for (const combo of todas) {
      expect(() => lookupAnnexC(combo)).not.toThrow();
    }
  });

  it("alocação respeita os grupos permitidos por slot", () => {
    const todas = combinacoes(TODOS_GRUPOS, 8);
    for (const combo of todas) {
      const aloc = lookupAnnexC(combo);
      for (const [matchNum, grupoTerceiro] of aloc) {
        const permitidos = GRUPOS_PERMITIDOS_POR_MATCH[matchNum];
        expect(permitidos).toBeDefined();
        expect(
          permitidos.has(grupoTerceiro),
          `match ${matchNum} recebeu 3${grupoTerceiro} mas só aceita ${[...permitidos].join(",")}`,
        ).toBe(true);
      }
    }
  });

  it("nenhum 3º cai contra o 1º do próprio grupo", () => {
    const todas = combinacoes(TODOS_GRUPOS, 8);
    for (const combo of todas) {
      const aloc = lookupAnnexC(combo);
      for (const [matchNum, grupoTerceiro] of aloc) {
        const grupoPrimeiro = PRIMEIRO_DO_MATCH[matchNum];
        expect(
          grupoTerceiro,
          `match ${matchNum}: 1${grupoPrimeiro} vs 3${grupoTerceiro} (mesmo grupo!)`,
        ).not.toBe(grupoPrimeiro);
      }
    }
  });

  it("cada alocação usa os 8 grupos da combinação, sem repetição", () => {
    const todas = combinacoes(TODOS_GRUPOS, 8);
    for (const combo of todas) {
      const aloc = lookupAnnexC(combo);
      const grupos = [...aloc.values()];
      expect(grupos.length).toBe(8);
      expect(new Set(grupos).size).toBe(8); // sem repetição
      // Deve ser permutação do combo
      expect([...grupos].sort().join("")).toBe([...combo].sort().join(""));
    }
  });
});

describe("Casos de regressão dos 5 usuários (FIFA esperado)", () => {
  // Dados extraídos de Prompts/fix-matamata/casos-regressao.json
  // Para cada user: combinacaoTerceiros (input) → alocacaoEsperada (output)
  const CASOS: Array<{
    nome: string;
    combinacao: Grupo[];
    esperado: Record<number, Grupo>;
  }> = [
    {
      nome: "Fernando",
      combinacao: ["A", "E", "G", "H", "I", "J", "K", "L"],
      esperado: { 74: "A", 77: "G", 79: "E", 80: "K", 81: "I", 82: "H", 85: "J", 87: "L" },
    },
    {
      nome: "Lucas Loures",
      combinacao: ["A", "B", "C", "D", "E", "G", "J", "L"],
      esperado: { 74: "C", 77: "D", 79: "E", 80: "J", 81: "B", 82: "A", 85: "G", 87: "L" },
    },
    {
      nome: "Deusdedit Motta",
      combinacao: ["A", "B", "C", "D", "E", "G", "I", "L"],
      esperado: { 74: "C", 77: "D", 79: "E", 80: "I", 81: "B", 82: "A", 85: "G", 87: "L" },
    },
    {
      nome: "Rodrigo Carvalho",
      combinacao: ["A", "C", "E", "F", "I", "J", "K", "L"],
      esperado: { 74: "C", 77: "F", 79: "E", 80: "K", 81: "I", 82: "A", 85: "J", 87: "L" },
    },
    {
      nome: "Vitor Baracho",
      combinacao: ["A", "C", "D", "E", "F", "H", "J", "L"],
      esperado: { 74: "C", 77: "D", 79: "H", 80: "E", 81: "F", 82: "A", 85: "J", 87: "L" },
    },
  ];

  for (const c of CASOS) {
    it(`${c.nome}: aloca corretamente os 8 melhores 3ºs`, () => {
      const aloc = lookupAnnexC(c.combinacao);
      for (const [matchStr, grupoEsperado] of Object.entries(c.esperado)) {
        const match = Number(matchStr);
        expect(aloc.get(match), `match ${match} esperava 3${grupoEsperado}`).toBe(grupoEsperado);
      }
    });
  }
});

describe("Estrutura mata-mata-estrutura.ts", () => {
  it("R16 tem 8 jogos (89-96), QF 4 (97-100), SF 2 (101-102), Final 104", () => {
    const cmpNum = (a: number, b: number) => a - b;
    expect(R16.length).toBe(8);
    expect(R16.map((n) => n.jogo).sort(cmpNum)).toEqual([89, 90, 91, 92, 93, 94, 95, 96]);
    expect(QF.length).toBe(4);
    expect(QF.map((n) => n.jogo).sort(cmpNum)).toEqual([97, 98, 99, 100]);
    expect(SF.length).toBe(2);
    expect(SF.map((n) => n.jogo).sort(cmpNum)).toEqual([101, 102]);
    expect(FINAL.jogo).toBe(104);
  });

  it("origemJogos bate com a tabela oficial FIFA", () => {
    const m = new Map<number, [number, number]>();
    for (const n of [...R16, ...QF, ...SF, FINAL]) {
      if (n.origemJogos) m.set(n.jogo, n.origemJogos);
    }
    // R16
    expect(m.get(89)).toEqual([73, 74]);
    expect(m.get(90)).toEqual([75, 76]);
    expect(m.get(91)).toEqual([77, 78]);
    expect(m.get(92)).toEqual([79, 80]);
    expect(m.get(93)).toEqual([81, 82]);
    expect(m.get(94)).toEqual([83, 84]);
    expect(m.get(95)).toEqual([85, 86]);
    expect(m.get(96)).toEqual([87, 88]);
    // QF
    expect(m.get(97)).toEqual([89, 90]);
    expect(m.get(99)).toEqual([91, 92]);
    expect(m.get(98)).toEqual([93, 94]);
    expect(m.get(100)).toEqual([95, 96]);
    // SF
    expect(m.get(101)).toEqual([97, 99]);
    expect(m.get(102)).toEqual([98, 100]);
    // Final
    expect(m.get(104)).toEqual([101, 102]);
  });

  it("labelJogo(104) === 'Final' e outros mostram 'Jogo NN'", () => {
    expect(labelJogo(104)).toBe("Final");
    expect(labelJogo(73)).toBe("Jogo 73");
    expect(labelJogo(89)).toBe("Jogo 89");
    expect(labelJogo(101)).toBe("Jogo 101");
  });

  it("R32_ESQUERDO_ORDEM e R32_DIREITO_ORDEM cobrem todos os 16 jogos do R32", () => {
    const todos = [...R32_ESQUERDO_ORDEM, ...R32_DIREITO_ORDEM];
    expect(todos.length).toBe(16);
    expect(new Set(todos).size).toBe(16);
    expect([...todos].sort((a, b) => a - b)).toEqual([
      73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
    ]);
  });
});

describe("ORIGEM_TERCEIRO_LABEL", () => {
  it("formata posição 1-8 corretamente", () => {
    expect(ORIGEM_TERCEIRO_LABEL(1)).toBe("1º melhor 3º");
    expect(ORIGEM_TERCEIRO_LABEL(5)).toBe("5º melhor 3º");
    expect(ORIGEM_TERCEIRO_LABEL(8)).toBe("8º melhor 3º");
  });
});

describe("detectarEmpateTerceiros", () => {
  /** Helper: cria um jogo finalizado sintético */
  function j(grupo: Grupo, casa: string, fora: string, pc: number, pf: number): JogoFinalizado {
    return { grupo, time_casa_id: casa, time_fora_id: fora, placar_casa: pc, placar_fora: pf };
  }

  /** Helper: cria os 6 jogos de um grupo com placares específicos
   *  Time1 vs Time2, Time1 vs Time3, Time1 vs Time4, Time2 vs Time3,
   *  Time2 vs Time4, Time3 vs Time4
   */
  function grupoSintetico(
    grupo: Grupo,
    nomes: [string, string, string, string],
    resultados: [
      [number, number], // 1x2
      [number, number], // 1x3
      [number, number], // 1x4
      [number, number], // 2x3
      [number, number], // 2x4
      [number, number], // 3x4
    ],
  ): JogoFinalizado[] {
    const [n1, n2, n3, n4] = nomes;
    return [
      j(grupo, n1, n2, resultados[0][0], resultados[0][1]),
      j(grupo, n1, n3, resultados[1][0], resultados[1][1]),
      j(grupo, n1, n4, resultados[2][0], resultados[2][1]),
      j(grupo, n2, n3, resultados[3][0], resultados[3][1]),
      j(grupo, n2, n4, resultados[4][0], resultados[4][1]),
      j(grupo, n3, n4, resultados[5][0], resultados[5][1]),
    ];
  }

  it("retorna null com palpites incompletos (<12 grupos)", () => {
    const jogos: JogoFinalizado[] = [
      ...grupoSintetico("A", ["a1", "a2", "a3", "a4"], [[2, 0], [2, 0], [2, 0], [1, 0], [1, 0], [1, 0]]),
    ];
    expect(detectarEmpateTerceiros(jogos)).toBeNull();
  });

  it("retorna info quando há empate na faixa de corte (pos 6-10)", () => {
    // 12 grupos com placares idênticos pros 3ºs → empate total entre todos
    // Cada grupo: time1=9pts, time2=6pts, time3=3pts, time4=0pts
    // Saldo do 3º: -1 (faz 1 e sofre 2)
    const jogos: JogoFinalizado[] = [];
    for (const g of TODOS_GRUPOS) {
      jogos.push(
        ...grupoSintetico(
          g,
          [`${g}1`, `${g}2`, `${g}3`, `${g}4`],
          [
            [2, 1], // 1>2
            [2, 0], // 1>3
            [3, 0], // 1>4
            [2, 0], // 2>3
            [3, 1], // 2>4
            [1, 0], // 3>4
          ],
        ),
      );
    }
    const r = detectarEmpateTerceiros(jogos);
    expect(r).not.toBeNull();
    // Todos os 12 terceiros têm exatamente 3 pts, 0 saldo (1 gp), então empate
    expect(r!.quantidade).toBeGreaterThanOrEqual(2);
  });
});
