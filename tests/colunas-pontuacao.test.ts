import { describe, it, expect } from "vitest";
import { ROUND_LABELS, faseParaOrdemMata } from "../src/lib/recalc";

// ────────────────────────────────────────────────────────────────────────
// (43/45) Reconciliação das colunas do gráfico/heatmap: cada coluna do
// painel deve conter a fase que ela NOMEIA (alinhado à memória de cálculo).
// faseParaOrdemMata mapeia cada fase do palpite → ordem da coluna.
// ────────────────────────────────────────────────────────────────────────

const labelDaOrdem = (ordem: number) =>
  ROUND_LABELS.find((r) => r.ordem === ordem)?.label;

describe("(43/45) colunas de pontuação = fase que nomeiam", () => {
  it("cada fase de mata cai na coluna de mesmo nome", () => {
    expect(labelDaOrdem(faseParaOrdemMata["8avos"])).toBe("Oitavas");
    expect(labelDaOrdem(faseParaOrdemMata["quartas"])).toBe("Quartas");
    expect(labelDaOrdem(faseParaOrdemMata["semi"])).toBe("Semi");
    expect(labelDaOrdem(faseParaOrdemMata["final"])).toBe("Final");
  });

  it("campeão E vice (bucket 'campeao') caem na coluna Final — sem coluna própria", () => {
    expect(faseParaOrdemMata["campeao"]).toBe(8);
    expect(labelDaOrdem(8)).toBe("Final");
    // final e campeao compartilham a mesma coluna (8)
    expect(faseParaOrdemMata["campeao"]).toBe(faseParaOrdemMata["final"]);
  });

  it("R32 (pts_r32) é creditado na coluna 4 (16 Avos)", () => {
    expect(faseParaOrdemMata["16avos"]).toBe(4);
    expect(labelDaOrdem(4)).toBe("16 Avos");
  });

  it("ROUND_LABELS tem as 9 colunas na ordem certa (grupos→artilheiro)", () => {
    expect(ROUND_LABELS.map((r) => r.ordem)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(labelDaOrdem(9)).toBe("Artilheiro");
    expect(labelDaOrdem(1)).toBe("Grupos R1");
  });

  it("nenhuma fase de mata aponta pra antes do 16 Avos (col >= 4)", () => {
    for (const ord of Object.values(faseParaOrdemMata)) {
      expect(ord).toBeGreaterThanOrEqual(4);
      expect(ord).toBeLessThanOrEqual(8);
    }
  });
});
