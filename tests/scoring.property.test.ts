/**
 * A1 (QA Runbook adaptado) — property-based no motor de pontuação.
 * Função pura, sem rede/DB. Invariantes que valem pra QUALQUER entrada.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  avaliarPalpiteGrupo,
  pontosPalpiteGrupo,
  classificarPalpiteMata,
  PONTUACAO_DEFAULT,
} from "../src/lib/scoring";
import type { FasePalpiteMata } from "../src/types/database";

const gol = fc.integer({ min: 0, max: 20 });
const placar = fc.record({ casa: gol, fora: gol });

describe("scoring (property-based) — fase de grupos", () => {
  it("PROP-001: pontos de grupo ∈ {0, vencedor, exato} (nunca negativo, nunca > exato)", () => {
    fc.assert(
      fc.property(placar, placar, (palpite, real) => {
        const pts = pontosPalpiteGrupo(palpite, real);
        expect([0, PONTUACAO_DEFAULT.vencedor_ou_empate, PONTUACAO_DEFAULT.placar_exato]).toContain(pts);
        expect(pts).toBeGreaterThanOrEqual(0);
        expect(pts).toBeLessThanOrEqual(PONTUACAO_DEFAULT.placar_exato);
      }),
      { numRuns: 5000 },
    );
  });

  it("PROP-002: placar idêntico ⇔ exato (5 pts)", () => {
    fc.assert(
      fc.property(placar, (p) => {
        expect(avaliarPalpiteGrupo(p, p)).toBe("exato");
        expect(pontosPalpiteGrupo(p, p)).toBe(PONTUACAO_DEFAULT.placar_exato);
      }),
      { numRuns: 2000 },
    );
  });

  it("PROP-003: mesmo vencedor (ou empate) e placar diferente ⇒ 'vencedor_ou_empate'", () => {
    fc.assert(
      fc.property(placar, placar, (palpite, real) => {
        const mesmoSinal = Math.sign(palpite.casa - palpite.fora) === Math.sign(real.casa - real.fora);
        const exato = palpite.casa === real.casa && palpite.fora === real.fora;
        if (mesmoSinal && !exato) {
          expect(avaliarPalpiteGrupo(palpite, real)).toBe("vencedor_ou_empate");
        }
      }),
      { numRuns: 5000 },
    );
  });

  it("PROP-004: sinais opostos ⇒ sempre 'errado' (0 pts)", () => {
    fc.assert(
      fc.property(placar, placar, (palpite, real) => {
        const sp = Math.sign(palpite.casa - palpite.fora);
        const sr = Math.sign(real.casa - real.fora);
        if (sp !== sr) {
          expect(avaliarPalpiteGrupo(palpite, real)).toBe("errado");
          expect(pontosPalpiteGrupo(palpite, real)).toBe(0);
        }
      }),
      { numRuns: 5000 },
    );
  });

  it("PROP-005: simetria de troca casa↔fora preserva a categoria", () => {
    // Inverter casa/fora no palpite E no real não muda exato/vencedor/errado.
    fc.assert(
      fc.property(placar, placar, (palpite, real) => {
        const a = avaliarPalpiteGrupo(palpite, real);
        const b = avaliarPalpiteGrupo(
          { casa: palpite.fora, fora: palpite.casa },
          { casa: real.fora, fora: real.casa },
        );
        expect(b).toBe(a);
      }),
      { numRuns: 3000 },
    );
  });
});

describe("scoring (property-based) — mata-mata", () => {
  const fases: FasePalpiteMata[] = ["16avos", "8avos", "quartas", "semi", "final", "campeao"];
  const reais: (FasePalpiteMata | "grupos")[] = ["grupos", "16avos", "8avos", "quartas", "semi", "final", "campeao"];
  const ordem: Record<string, number> = { grupos: 0, "16avos": 1, "8avos": 2, quartas: 3, semi: 4, final: 5, campeao: 6 };

  it("PROP-010: acertou=false ⇒ faseEfetiva=null (sem ponto sem acerto)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...fases), fc.constantFrom(...reais), (palpite, real) => {
        const r = classificarPalpiteMata(palpite, real);
        if (!r.acertou) expect(r.faseEfetiva).toBeNull();
      }),
      { numRuns: 2000 },
    );
  });

  it("PROP-011: monotonia — se o time vai MAIS fundo, um palpite fixo nunca deixa de acertar", () => {
    fc.assert(
      fc.property(fc.constantFrom(...fases), fc.constantFrom(...reais), fc.constantFrom(...reais), (palpite, r1, r2) => {
        const menor = ordem[r1] <= ordem[r2] ? r1 : r2;
        const maior = ordem[r1] <= ordem[r2] ? r2 : r1;
        const accMenor = classificarPalpiteMata(palpite, menor).acertou;
        const accMaior = classificarPalpiteMata(palpite, maior).acertou;
        // se acertou com o time indo menos fundo, tem que acertar indo mais fundo
        if (accMenor) expect(accMaior).toBe(true);
      }),
      { numRuns: 3000 },
    );
  });

  it("PROP-012: palpite não-campeão e real >= palpite ⇒ acertou com faseEfetiva = palpite", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FasePalpiteMata>("16avos", "8avos", "quartas", "semi", "final"),
        fc.constantFrom(...reais),
        (palpite, real) => {
          if (ordem[real] >= ordem[palpite]) {
            expect(classificarPalpiteMata(palpite, real)).toEqual({ acertou: true, faseEfetiva: palpite });
          }
        },
      ),
      { numRuns: 3000 },
    );
  });
});
