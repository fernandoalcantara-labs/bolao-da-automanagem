import { describe, it, expect } from "vitest";
import {
  avaliarPalpiteGrupo,
  pontosPalpiteGrupo,
  pontosPalpiteMata,
  classificarPalpiteMata,
  PONTUACAO_DEFAULT,
} from "../src/lib/scoring";

describe("avaliarPalpiteGrupo", () => {
  it("placar exato", () => {
    expect(avaliarPalpiteGrupo({ casa: 2, fora: 1 }, { casa: 2, fora: 1 })).toBe("exato");
    expect(avaliarPalpiteGrupo({ casa: 0, fora: 0 }, { casa: 0, fora: 0 })).toBe("exato");
  });

  it("acertou só o vencedor", () => {
    expect(avaliarPalpiteGrupo({ casa: 3, fora: 0 }, { casa: 1, fora: 0 })).toBe("vencedor_ou_empate");
    expect(avaliarPalpiteGrupo({ casa: 0, fora: 1 }, { casa: 1, fora: 4 })).toBe("vencedor_ou_empate");
  });

  it("acertou só o empate", () => {
    expect(avaliarPalpiteGrupo({ casa: 1, fora: 1 }, { casa: 2, fora: 2 })).toBe("vencedor_ou_empate");
  });

  it("errou", () => {
    expect(avaliarPalpiteGrupo({ casa: 2, fora: 0 }, { casa: 1, fora: 3 })).toBe("errado");
    expect(avaliarPalpiteGrupo({ casa: 1, fora: 1 }, { casa: 2, fora: 0 })).toBe("errado");
  });
});

describe("pontosPalpiteGrupo", () => {
  it("aplica pontuação default", () => {
    expect(pontosPalpiteGrupo({ casa: 2, fora: 1 }, { casa: 2, fora: 1 })).toBe(5);
    expect(pontosPalpiteGrupo({ casa: 2, fora: 1 }, { casa: 1, fora: 0 })).toBe(2);
    expect(pontosPalpiteGrupo({ casa: 0, fora: 0 }, { casa: 1, fora: 0 })).toBe(0);
  });

  it("aceita pontuação custom (admin pode editar)", () => {
    const cfg = { ...PONTUACAO_DEFAULT, placar_exato: 10, vencedor_ou_empate: 3 };
    expect(pontosPalpiteGrupo({ casa: 2, fora: 1 }, { casa: 2, fora: 1 }, cfg)).toBe(10);
    expect(pontosPalpiteGrupo({ casa: 2, fora: 1 }, { casa: 1, fora: 0 }, cfg)).toBe(3);
  });
});

describe("pontosPalpiteMata", () => {
  it("mapeia fases corretas (palpite = time chega à fase X)", () => {
    expect(pontosPalpiteMata("8avos")).toBe(8);   // chegou às oitavas (passou do R32)
    expect(pontosPalpiteMata("quartas")).toBe(12); // chegou às quartas (passou das oitavas)
    expect(pontosPalpiteMata("semi")).toBe(16);    // chegou à semi
    expect(pontosPalpiteMata("final")).toBe(20);   // chegou à final
    expect(pontosPalpiteMata("vice")).toBe(24);
    expect(pontosPalpiteMata("campeao")).toBe(40);
  });
});

describe("classificarPalpiteMata", () => {
  it("acertou: time chegou exatamente à fase palpitada", () => {
    expect(classificarPalpiteMata("8avos", "8avos")).toEqual({
      acertou: true,
      faseEfetiva: "8avos",
    });
  });

  it("acertou: time foi ALÉM da fase palpitada — vale a fase palpitada", () => {
    expect(classificarPalpiteMata("16avos", "campeao")).toEqual({
      acertou: true,
      faseEfetiva: "16avos",
    });
  });

  it("errou: time não chegou à fase palpitada", () => {
    expect(classificarPalpiteMata("quartas", "8avos")).toEqual({
      acertou: false,
      faseEfetiva: null,
    });
  });

  it("errou: time eliminado na fase de grupos", () => {
    expect(classificarPalpiteMata("16avos", "grupos")).toEqual({
      acertou: false,
      faseEfetiva: null,
    });
  });

  it("palpitou campeão mas foi vice → vale como vice", () => {
    expect(classificarPalpiteMata("campeao", "final")).toEqual({
      acertou: true,
      faseEfetiva: "vice",
    });
  });

  it("palpitou campeão e acertou", () => {
    expect(classificarPalpiteMata("campeao", "campeao")).toEqual({
      acertou: true,
      faseEfetiva: "campeao",
    });
  });

  it("palpitou final, time foi campeão → palpite 'chegou na final' continua válido (20 pts)", () => {
    expect(classificarPalpiteMata("final", "campeao")).toEqual({
      acertou: true,
      faseEfetiva: "final",
    });
    expect(pontosPalpiteMata("final")).toBe(20);
  });
});

describe("classificação na fase de grupos", () => {
  it("calcula stats básicos", async () => {
    const { calcularStatsGrupos } = await import("../src/lib/classification");
    const stats = calcularStatsGrupos([
      { grupo: "A", time_casa_id: "br", time_fora_id: "ar", placar_casa: 2, placar_fora: 1 },
      { grupo: "A", time_casa_id: "br", time_fora_id: "fr", placar_casa: 0, placar_fora: 0 },
      { grupo: "A", time_casa_id: "ar", time_fora_id: "fr", placar_casa: 1, placar_fora: 2 },
    ]);
    const brasil = stats.find((s) => s.time_id === "br")!;
    expect(brasil.pontos).toBe(4); // 1V 1E
    expect(brasil.saldo).toBe(1);
    expect(brasil.gols_pro).toBe(2);
  });

  it("aplica cascata de desempate: pontos → saldo → gols pró → h2h", async () => {
    const { classificarPorGrupo } = await import("../src/lib/classification");
    const jogos = [
      { grupo: "A" as const, time_casa_id: "A", time_fora_id: "B", placar_casa: 1, placar_fora: 0 },
      { grupo: "A" as const, time_casa_id: "B", time_fora_id: "C", placar_casa: 1, placar_fora: 0 },
      { grupo: "A" as const, time_casa_id: "C", time_fora_id: "A", placar_casa: 1, placar_fora: 0 },
      { grupo: "A" as const, time_casa_id: "A", time_fora_id: "D", placar_casa: 0, placar_fora: 0 },
      { grupo: "A" as const, time_casa_id: "B", time_fora_id: "D", placar_casa: 0, placar_fora: 0 },
      { grupo: "A" as const, time_casa_id: "C", time_fora_id: "D", placar_casa: 0, placar_fora: 0 },
    ];
    const classif = classificarPorGrupo(jogos);
    expect(classif).toHaveLength(1);
    // A, B, C todos com 4 pts; saldo igual; gols pró igual; desempate vai p/ id
    expect(classif[0].primeiro.pontos).toBe(4);
  });
});
