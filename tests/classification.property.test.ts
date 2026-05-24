/**
 * A1 (QA Runbook adaptado) — property-based na classificação FIFA.
 * Função pura. Gera 12 grupos completos (72 jogos) com placares aleatórios
 * e valida invariantes do regulamento (Art. 19 + 8 melhores 3ºs).
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  classificadosParaMataMata,
  classificarPorGrupo,
  type JogoFinalizado,
  type StatsTime,
} from "../src/lib/classification";
import type { Grupo } from "../src/types/database";

const GRUPOS = "ABCDEFGHIJKL".split("") as Grupo[];
// round-robin de 4 times: 6 jogos
const PARES: [number, number][] = [
  [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
];

/** Constrói 72 jogos (12 grupos × 6) a partir de 72 placares. */
function montarJogos(placares: { casa: number; fora: number }[]): JogoFinalizado[] {
  const jogos: JogoFinalizado[] = [];
  let idx = 0;
  for (const g of GRUPOS) {
    for (const [a, b] of PARES) {
      const p = placares[idx++];
      jogos.push({
        grupo: g,
        time_casa_id: `${g}${a}`,
        time_fora_id: `${g}${b}`,
        placar_casa: p.casa,
        placar_fora: p.fora,
      });
    }
  }
  return jogos;
}

const golArb = fc.integer({ min: 0, max: 6 });
const placaresArb = fc.array(fc.record({ casa: golArb, fora: golArb }), {
  minLength: 72,
  maxLength: 72,
});

function strictlyBetter(a: StatsTime, b: StatsTime): boolean {
  if (a.pontos !== b.pontos) return a.pontos > b.pontos;
  if (a.saldo !== b.saldo) return a.saldo > b.saldo;
  return a.gols_pro > b.gols_pro;
}

describe("classificadosParaMataMata (property-based)", () => {
  it("CLASS-PROP-001: 12 grupos completos ⇒ exatamente 32 classificados (12+12+8)", () => {
    fc.assert(
      fc.property(placaresArb, (placares) => {
        const r = classificadosParaMataMata(montarJogos(placares));
        expect(r.primeiros).toHaveLength(12);
        expect(r.segundos).toHaveLength(12);
        expect(r.terceirosClassificados).toHaveLength(8);
        expect(r.terceirosEliminados).toHaveLength(4);
        expect(r.todosClassificados).toHaveLength(32);
      }),
      { numRuns: 800 },
    );
  });

  it("CLASS-PROP-002: sem time_id duplicado entre os 32 classificados", () => {
    fc.assert(
      fc.property(placaresArb, (placares) => {
        const r = classificadosParaMataMata(montarJogos(placares));
        const ids = r.todosClassificados.map((t) => t.time_id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 800 },
    );
  });

  it("CLASS-PROP-003: determinístico — mesma entrada ⇒ mesma saída (ordem inclusa)", () => {
    fc.assert(
      fc.property(placaresArb, (placares) => {
        const jogos = montarJogos(placares);
        const a = classificadosParaMataMata(jogos).todosClassificados.map((t) => t.time_id);
        const b = classificadosParaMataMata(jogos).todosClassificados.map((t) => t.time_id);
        expect(b).toEqual(a);
      }),
      { numRuns: 500 },
    );
  });

  it("CLASS-PROP-004: dentro do grupo, pontos são não-crescentes (1º≥2º≥3º≥4º)", () => {
    fc.assert(
      fc.property(placaresArb, (placares) => {
        for (const c of classificarPorGrupo(montarJogos(placares))) {
          expect(c.primeiro.pontos).toBeGreaterThanOrEqual(c.segundo.pontos);
          expect(c.segundo.pontos).toBeGreaterThanOrEqual(c.terceiro.pontos);
          expect(c.terceiro.pontos).toBeGreaterThanOrEqual(c.quarto.pontos);
        }
      }),
      { numRuns: 800 },
    );
  });

  it("CLASS-PROP-005: nenhum 3º eliminado é ESTRITAMENTE melhor que um 3º classificado", () => {
    // invariante dos "8 melhores 3ºs": se um eliminado fosse melhor por
    // pontos→saldo→gp, ele teria classificado. Empate (resolvido por id) é ok.
    fc.assert(
      fc.property(placaresArb, (placares) => {
        const r = classificadosParaMataMata(montarJogos(placares));
        for (const e of r.terceirosEliminados) {
          for (const c of r.terceirosClassificados) {
            expect(strictlyBetter(e, c)).toBe(false);
          }
        }
      }),
      { numRuns: 800 },
    );
  });

  it("CLASS-PROP-006: todo classificado é 1º/2º/3º real do seu grupo", () => {
    fc.assert(
      fc.property(placaresArb, (placares) => {
        const jogos = montarJogos(placares);
        const classifPorGrupo = classificarPorGrupo(jogos);
        const r = classificadosParaMataMata(jogos);
        const top3PorGrupo = new Map(
          classifPorGrupo.map((c) => [c.grupo, new Set([c.primeiro.time_id, c.segundo.time_id, c.terceiro.time_id])]),
        );
        for (const t of r.todosClassificados) {
          expect(top3PorGrupo.get(t.grupo)!.has(t.time_id)).toBe(true);
        }
      }),
      { numRuns: 800 },
    );
  });
});
