import { describe, it, expect } from "vitest";
import {
  avaliarPalpiteGrupo,
  pontosPalpiteGrupo,
  pontosPalpiteMata,
  classificarPalpiteMata,
  normalizarPontuacao,
  timeVicePalpitado,
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
  it("mapeia fases 1:1 por fase alcançada (pts_*)", () => {
    expect(pontosPalpiteMata("16avos")).toBe(2);   // pts_r32 — classificou ao R32 (16 Avos)
    expect(pontosPalpiteMata("8avos")).toBe(8);    // pts_oitavas
    expect(pontosPalpiteMata("quartas")).toBe(12); // pts_quartas
    expect(pontosPalpiteMata("semi")).toBe(16);    // pts_semi
    expect(pontosPalpiteMata("final")).toBe(20);   // pts_final
    expect(pontosPalpiteMata("vice")).toBe(24);
    expect(pontosPalpiteMata("campeao")).toBe(40);
  });

  it("(3B) aceita config LEGADA e remapeia por significado", () => {
    // config antiga (mata_*) sem pts_*: deve mapear semanticamente
    const legada = {
      placar_exato: 5, vencedor_ou_empate: 2,
      mata_16avos: 8, mata_8avos: 16, mata_quartas: 20, mata_semi: 24,
      vice: 30, campeao: 50, artilheiro: 24,
    } as any;
    expect(pontosPalpiteMata("8avos", legada)).toBe(8);   // ← mata_16avos
    expect(pontosPalpiteMata("quartas", legada)).toBe(16); // ← mata_8avos
    expect(pontosPalpiteMata("semi", legada)).toBe(20);    // ← mata_quartas
    expect(pontosPalpiteMata("final", legada)).toBe(24);   // ← mata_semi
    expect(pontosPalpiteMata("16avos", legada)).toBe(2);   // pts_r32 default
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

  it("(3D) palpitou campeão e foi VICE → NÃO acerta (sem downgrade)", () => {
    // o vice do apostador é tratado à parte (timeVicePalpitado); o palpite
    // de "campeao" só pontua se o time for o campeão REAL.
    expect(classificarPalpiteMata("campeao", "final")).toEqual({
      acertou: false,
      faseEfetiva: null,
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

describe("(3B) normalizarPontuacao — remapeia legado por significado", () => {
  it("config legada: mata_quartas=16 → pts_semi=16; mata_semi=20 → pts_final=20", () => {
    const n = normalizarPontuacao({
      placar_exato: 5, vencedor_ou_empate: 2,
      mata_16avos: 8, mata_8avos: 12, mata_quartas: 16, mata_semi: 20,
      vice: 24, campeao: 40, artilheiro: 24,
    } as any);
    expect(n.pts_oitavas).toBe(8);  // ← mata_16avos
    expect(n.pts_quartas).toBe(12); // ← mata_8avos
    expect(n.pts_semi).toBe(16);    // ← mata_quartas
    expect(n.pts_final).toBe(20);   // ← mata_semi
    expect(n.pts_r32).toBe(2);      // default novo
  });

  it("config de PRODUÇÃO (mata_8avos=16, mata_quartas=20, mata_semi=24, vice30/camp50)", () => {
    const n = normalizarPontuacao({
      placar_exato: 5, vencedor_ou_empate: 2,
      mata_16avos: 8, mata_8avos: 16, mata_quartas: 20, mata_semi: 24,
      vice: 30, campeao: 50, artilheiro: 24,
    } as any);
    expect(n.pts_r32).toBe(2);
    expect(n.pts_oitavas).toBe(8);
    expect(n.pts_quartas).toBe(16);
    expect(n.pts_semi).toBe(20);
    expect(n.pts_final).toBe(24);
    expect(n.vice).toBe(30);
    expect(n.campeao).toBe(50);
  });

  it("idempotente: config já no padrão pts_* passa intacta", () => {
    const a = normalizarPontuacao(PONTUACAO_DEFAULT);
    const b = normalizarPontuacao(a);
    expect(b.pts_r32).toBe(a.pts_r32);
    expect(b.pts_final).toBe(a.pts_final);
  });

  it("pts_* explícito tem prioridade sobre legado", () => {
    const n = normalizarPontuacao({ pts_final: 99, mata_semi: 20 } as any);
    expect(n.pts_final).toBe(99);
  });
});

describe("(3D) timeVicePalpitado — 2º finalista do usuário", () => {
  it("2 finalistas + 1 campeão → o outro finalista é o vice", () => {
    expect(timeVicePalpitado(["BRA", "FRA"], "BRA")).toBe("FRA");
    expect(timeVicePalpitado(["BRA", "FRA"], "FRA")).toBe("BRA");
  });
  it("sem campeão definido → null", () => {
    expect(timeVicePalpitado(["BRA", "FRA"], null)).toBeNull();
  });
  it("só 1 finalista (= campeão) → null (não há 2º finalista)", () => {
    expect(timeVicePalpitado(["BRA"], "BRA")).toBeNull();
  });
  it("3 finalistas (estado inválido) → null (ambíguo)", () => {
    expect(timeVicePalpitado(["BRA", "FRA", "ARG"], "BRA")).toBeNull();
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

  it("aplica cascata de desempate: pontos → confronto direto → saldo → gols pró", async () => {
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
