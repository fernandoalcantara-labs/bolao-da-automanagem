import { describe, it, expect } from "vitest";
import { agruparPorContagem } from "../src/lib/pie-data";

// ────────────────────────────────────────────────────────────────────────
// (53) agruparPorContagem — base dos donuts campeão/artilheiro.
// Robustez contra lixo de palpite órfão (id/nome null/vazio/"null").
// ────────────────────────────────────────────────────────────────────────

describe("(53) agruparPorContagem — contagem + ordenação", () => {
  it("conta ocorrências e ordena por valor desc", () => {
    const nomes = { a: "Brasil", b: "Argentina", c: "França" };
    const r = agruparPorContagem(["a", "a", "a", "b", "c", "c"], nomes);
    expect(r).toEqual([
      { name: "Brasil", value: 3 },
      { name: "França", value: 2 },
      { name: "Argentina", value: 1 },
    ]);
  });

  it("agrupa por NOME (ids distintos com mesmo nome somam)", () => {
    const nomes = { x1: "Brasil", x2: "Brasil", y: "Itália" };
    const r = agruparPorContagem(["x1", "x2", "y"], nomes);
    expect(r).toEqual([
      { name: "Brasil", value: 2 },
      { name: "Itália", value: 1 },
    ]);
  });
});

describe("(53) agruparPorContagem — ignora lixo (null/vazio/'null')", () => {
  it("pula id sem nome no mapa", () => {
    const nomes = { a: "Brasil" } as Record<string, string>;
    const r = agruparPorContagem(["a", "fantasma"], nomes);
    expect(r).toEqual([{ name: "Brasil", value: 1 }]);
  });

  it("pula nome vazio, só-espaços e 'null'/'undefined' (case-insensitive)", () => {
    const nomes = {
      a: "Brasil",
      vazio: "",
      espaco: "   ",
      lixo1: "null",
      lixo2: "NULL",
      lixo3: "undefined",
    } as Record<string, string>;
    const r = agruparPorContagem(["a", "vazio", "espaco", "lixo1", "lixo2", "lixo3"], nomes);
    expect(r).toEqual([{ name: "Brasil", value: 1 }]);
  });

  it("pula id vazio/só-espaço na lista de entrada", () => {
    const nomes = { a: "Brasil" } as Record<string, string>;
    const r = agruparPorContagem(["a", "", "   "], nomes);
    expect(r).toEqual([{ name: "Brasil", value: 1 }]);
  });

  it("faz trim no nome antes de agrupar (' Brasil ' == 'Brasil')", () => {
    const nomes = { a: " Brasil ", b: "Brasil" } as Record<string, string>;
    const r = agruparPorContagem(["a", "b"], nomes);
    expect(r).toEqual([{ name: "Brasil", value: 2 }]);
  });

  it("lista vazia → []", () => {
    expect(agruparPorContagem([], {})).toEqual([]);
  });
});
