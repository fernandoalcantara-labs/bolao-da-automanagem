import { describe, it, expect } from "vitest";
import {
  aplicarOverridesNaFase,
  faseAlcancadaDeRosters,
  faseDecidida,
  estadoPalpiteMata,
  ALVO_FASE,
  FASES_MATA,
} from "../src/lib/mata-roster";
import type { FasePalpiteMata } from "../src/types/database";

function rosters(map: Partial<Record<FasePalpiteMata, string[]>>): Map<FasePalpiteMata, Set<string>> {
  const m = new Map<FasePalpiteMata, Set<string>>();
  for (const f of FASES_MATA) m.set(f, new Set(map[f] ?? []));
  return m;
}

describe("aplicarOverridesNaFase", () => {
  it("incluir adiciona, excluir remove (sobre a base)", () => {
    const base = new Set(["A", "B"]);
    const out = aplicarOverridesNaFase(base, [
      { time_id: "C", incluir: true },
      { time_id: "B", incluir: false },
    ]);
    expect([...out].sort()).toEqual(["A", "C"]);
  });
  it("não muta a base", () => {
    const base = new Set(["A"]);
    aplicarOverridesNaFase(base, [{ time_id: "X", incluir: true }]);
    expect([...base]).toEqual(["A"]);
  });
});

describe("faseAlcancadaDeRosters — fase verde mais profunda", () => {
  it("pega a fase mais profunda em que o time aparece", () => {
    const r = rosters({
      "16avos": ["A", "B", "C"],
      "8avos": ["A", "B"],
      "quartas": ["A"],
      "final": ["A", "B"], // A e B finalistas
      "campeao": ["A"], // A campeão; B vice (final, não campeao)
    });
    const fa = faseAlcancadaDeRosters(r, ["A", "B", "C", "D"]);
    expect(fa.get("A")).toBe("campeao");
    expect(fa.get("B")).toBe("final"); // = vice
    expect(fa.get("C")).toBe("16avos");
    expect(fa.get("D")).toBe("grupos"); // nunca apareceu
  });
});

describe("faseDecidida — roster atingiu o alvo", () => {
  it("campeao decidido quando há 1; 16avos quando há 32", () => {
    expect(faseDecidida(rosters({ campeao: ["A"] }), "campeao")).toBe(true);
    expect(faseDecidida(rosters({ campeao: [] }), "campeao")).toBe(false);
    const trinta2 = Array.from({ length: 32 }, (_, i) => `T${i}`);
    expect(faseDecidida(rosters({ "16avos": trinta2 }), "16avos")).toBe(true);
    expect(faseDecidida(rosters({ "16avos": trinta2.slice(0, 31) }), "16avos")).toBe(false);
  });
  it("ALVO_FASE bate com o regulamento", () => {
    expect(ALVO_FASE).toMatchObject({ "16avos": 32, "8avos": 16, quartas: 8, semi: 4, final: 2, campeao: 1 });
  });
});

describe("estadoPalpiteMata", () => {
  it("acertou → 'acertou'", () => {
    expect(estadoPalpiteMata(true, false)).toBe("acertou");
  });
  it("não acertou + fase decidida → 'errou'", () => {
    expect(estadoPalpiteMata(false, true)).toBe("errou");
  });
  it("não acertou + fase indecisa → 'pendente'", () => {
    expect(estadoPalpiteMata(false, false)).toBe("pendente");
  });
});
