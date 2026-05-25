/**
 * A1 (QA Runbook adaptado) — property-based no rateio de prêmios.
 * Função pura. Invariantes de dinheiro: nada negativo, nada duplicado,
 * total preservado, top-3 nunca também lanterninha.
 */
import { describe, it, expect } from "vitest";
import { calcularRateio, somaRateio, RATEIO_DEFAULT, type RankingItem } from "../src/lib/prizes";
import type { RateioConfig } from "../src/types/database";
import fc from "fast-check";

// rankings de 1..120 participantes, pontos 0..1000
const rankingArb = fc
  .integer({ min: 1, max: 120 })
  .chain((n) =>
    fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: n, maxLength: n }).map((pontos) =>
      pontos.map((p, i): RankingItem => ({ user_id: `u${i}`, nome: `User ${i}`, pontos: p })),
    ),
  );

// dois rateios válidos (somam 100)
const rateios: RateioConfig[] = [
  RATEIO_DEFAULT, // 65/20/10/5/0
  { primeiro: 55, segundo: 20, terceiro: 10, lanterninha: 5, artilheiro: 10 },
  { primeiro: 70, segundo: 15, terceiro: 10, lanterninha: 5, artilheiro: 0 },
];

const totalArb = fc.integer({ min: 1, max: 100000 });
const rateioArb = fc.constantFrom(...rateios);

describe("calcularRateio (property-based)", () => {
  it("PRIZE-PROP-001: nenhum valor é negativo", () => {
    fc.assert(
      fc.property(rankingArb, rateioArb, totalArb, (ranking, rateio, total) => {
        const r = calcularRateio(ranking, rateio, total, []);
        for (const cat of [r.primeiro, r.segundo, r.terceiro, r.lanterninha, r.artilheiro]) {
          expect(cat.valor_total).toBeGreaterThanOrEqual(0);
          expect(cat.valor_por_pessoa).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it("PRIZE-PROP-002: valor_total de cada categoria = pct% do arrecadado", () => {
    fc.assert(
      fc.property(rankingArb, rateioArb, totalArb, (ranking, rateio, total) => {
        const r = calcularRateio(ranking, rateio, total, []);
        expect(r.primeiro.valor_total).toBeCloseTo((total * rateio.primeiro) / 100, 6);
        expect(r.segundo.valor_total).toBeCloseTo((total * rateio.segundo) / 100, 6);
        expect(r.terceiro.valor_total).toBeCloseTo((total * rateio.terceiro) / 100, 6);
        expect(r.lanterninha.valor_total).toBeCloseTo((total * rateio.lanterninha) / 100, 6);
      }),
      { numRuns: 3000 },
    );
  });

  it("PRIZE-PROP-003: soma dos valor_total das 5 categorias = total (rateio soma 100)", () => {
    fc.assert(
      fc.property(rankingArb, rateioArb, totalArb, (ranking, rateio, total) => {
        // só vale quando o rateio soma 100 (todos os usados aqui somam)
        expect(somaRateio(rateio)).toBe(100);
        const r = calcularRateio(ranking, rateio, total, ["u0"]);
        const soma =
          r.primeiro.valor_total +
          r.segundo.valor_total +
          r.terceiro.valor_total +
          r.lanterninha.valor_total +
          r.artilheiro.valor_total;
        expect(soma).toBeCloseTo(total, 4);
      }),
      { numRuns: 3000 },
    );
  });

  it("PRIZE-PROP-004: valor_por_pessoa = valor_total / nº de ganhadores (ou 0 se vazio)", () => {
    fc.assert(
      fc.property(rankingArb, rateioArb, totalArb, (ranking, rateio, total) => {
        const r = calcularRateio(ranking, rateio, total, []);
        for (const cat of [r.primeiro, r.segundo, r.terceiro, r.lanterninha]) {
          if (cat.user_ids.length === 0) {
            expect(cat.valor_por_pessoa).toBe(0);
          } else {
            expect(cat.valor_por_pessoa).toBeCloseTo(cat.valor_total / cat.user_ids.length, 6);
          }
        }
      }),
      { numRuns: 3000 },
    );
  });

  it("PRIZE-PROP-005: ninguém é top-3 E lanterninha ao mesmo tempo", () => {
    fc.assert(
      fc.property(rankingArb, rateioArb, totalArb, (ranking, rateio, total) => {
        const r = calcularRateio(ranking, rateio, total, []);
        const top3 = new Set([...r.primeiro.user_ids, ...r.segundo.user_ids, ...r.terceiro.user_ids]);
        for (const id of r.lanterninha.user_ids) {
          expect(top3.has(id)).toBe(false);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it("PRIZE-PROP-006: todo ganhador existe no ranking e não há id repetido dentro da categoria", () => {
    fc.assert(
      fc.property(rankingArb, rateioArb, totalArb, (ranking, rateio, total) => {
        const ids = new Set(ranking.map((r) => r.user_id));
        const r = calcularRateio(ranking, rateio, total, []);
        for (const cat of [r.primeiro, r.segundo, r.terceiro, r.lanterninha]) {
          expect(new Set(cat.user_ids).size).toBe(cat.user_ids.length); // sem repetição
          for (const id of cat.user_ids) expect(ids.has(id)).toBe(true); // existe no ranking
        }
      }),
      { numRuns: 3000 },
    );
  });

  it("PRIZE-PROP-007: todos empatados em 1º dividem igual (todos os pontos iguais)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 100000 }), (n, total) => {
        const ranking: RankingItem[] = Array.from({ length: n }, (_, i) => ({
          user_id: `u${i}`,
          nome: `U${i}`,
          pontos: 100, // todos iguais
        }));
        const r = calcularRateio(ranking, RATEIO_DEFAULT, total, []);
        // todos no 1º; lanterninha vazio (todos são top); valor por pessoa = 65%/n
        expect(r.primeiro.user_ids.length).toBe(n);
        expect(r.primeiro.valor_por_pessoa).toBeCloseTo((total * 0.65) / n, 4);
      }),
      { numRuns: 1000 },
    );
  });
});
