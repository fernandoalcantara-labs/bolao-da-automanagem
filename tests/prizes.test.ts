import { describe, it, expect } from "vitest";
import { calcularRateio, somaRateio, rateioValido, RATEIO_DEFAULT } from "../src/lib/prizes";

const ranking = [
  { user_id: "u1", nome: "Alice", pontos: 200 },
  { user_id: "u2", nome: "Bob", pontos: 150 },
  { user_id: "u3", nome: "Carol", pontos: 100 },
  { user_id: "u4", nome: "Diego", pontos: 80 },
  { user_id: "u5", nome: "Eve", pontos: 50 },
];

describe("calcularRateio", () => {
  it("distribuição clássica sem empates (1º único)", () => {
    const r = calcularRateio(ranking, RATEIO_DEFAULT, 1000, []);
    expect(r.primeiro.user_ids).toEqual(["u1"]);
    expect(r.primeiro.valor_por_pessoa).toBe(650); // 65% de 1000
    expect(r.segundo.valor_por_pessoa).toBe(200); // 20%
    expect(r.terceiro.valor_por_pessoa).toBe(100); // 10%
    expect(r.lanterninha.user_ids).toEqual(["u5"]);
    expect(r.lanterninha.valor_por_pessoa).toBe(50); // 5%
  });

  it("lanterninha recebe percentual configurado", () => {
    const r = calcularRateio(ranking, { ...RATEIO_DEFAULT, lanterninha: 10, primeiro: 60 }, 1000, []);
    expect(r.lanterninha.valor_por_pessoa).toBe(100);
  });

  it("empate em último divide o prêmio do lanterninha igualmente", () => {
    const empate = [
      ...ranking,
      { user_id: "u6", nome: "Frank", pontos: 50 }, // empata com Eve
    ];
    const r = calcularRateio(empate, RATEIO_DEFAULT, 1000, []);
    expect(r.lanterninha.user_ids).toHaveLength(2);
    expect(r.lanterninha.user_ids).toContain("u5");
    expect(r.lanterninha.user_ids).toContain("u6");
    expect(r.lanterninha.valor_por_pessoa).toBe(25); // 50/2
  });

  it("empate em 1º lugar divide o prêmio do campeão", () => {
    const empate = [
      { user_id: "u1", nome: "Alice", pontos: 200 },
      { user_id: "u2", nome: "Bob", pontos: 200 }, // empata em 1º
      { user_id: "u3", nome: "Carol", pontos: 150 },
      { user_id: "u4", nome: "Diego", pontos: 50 },
    ];
    const r = calcularRateio(empate, RATEIO_DEFAULT, 1000, []);
    expect(r.primeiro.user_ids).toHaveLength(2);
    expect(r.primeiro.valor_por_pessoa).toBe(325); // 650/2
  });

  it("alguém top-3 e simultaneamente último ganha só o prêmio maior", () => {
    // Só 3 participantes: o último é também o 3º
    const so3 = [
      { user_id: "u1", nome: "Alice", pontos: 200 },
      { user_id: "u2", nome: "Bob", pontos: 150 },
      { user_id: "u3", nome: "Carol", pontos: 100 },
    ];
    const r = calcularRateio(so3, RATEIO_DEFAULT, 1000, []);
    expect(r.terceiro.user_ids).toEqual(["u3"]);
    // Carol não deve receber também como lanterninha
    expect(r.lanterninha.user_ids).not.toContain("u3");
    expect(r.lanterninha.user_ids).toHaveLength(0);
  });

  it("artilheiro divide entre todos que acertaram", () => {
    const r = calcularRateio(
      ranking,
      { ...RATEIO_DEFAULT, artilheiro: 10, primeiro: 60 },
      1000,
      ["u2", "u4"],
    );
    expect(r.artilheiro.user_ids).toEqual(["u2", "u4"]);
    expect(r.artilheiro.valor_por_pessoa).toBe(50); // 100/2
  });

  it("artilheiro 0% retorna valor zero", () => {
    const r = calcularRateio(ranking, RATEIO_DEFAULT, 1000, ["u2"]);
    expect(r.artilheiro.user_ids).toEqual(["u2"]);
    expect(r.artilheiro.valor_por_pessoa).toBe(0);
    expect(r.artilheiro.valor_total).toBe(0);
  });
});

describe("somaRateio / rateioValido", () => {
  it("soma dos rateios = 100% no default", () => {
    expect(somaRateio(RATEIO_DEFAULT)).toBe(100);
    expect(rateioValido(RATEIO_DEFAULT)).toBe(true);
  });

  it("detecta rateio inválido (soma != 100)", () => {
    expect(rateioValido({ ...RATEIO_DEFAULT, primeiro: 50 })).toBe(false);
    expect(somaRateio({ ...RATEIO_DEFAULT, primeiro: 50 })).toBe(85);
  });
});
