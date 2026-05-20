/**
 * Estrutura oficial de avanço do mata-mata da Copa 2026.
 *
 * Cada partida do mata-mata (jogos 73 a 104) tem um número FIFA fixo e,
 * a partir das oitavas, é definida pelos VENCEDORES de dois jogos anteriores.
 *
 * Fonte: tabela oficial FIFA (corrigida em 2026-05-20 — Fernando).
 *
 * Pareamento oficial:
 *   R32 (73-88): definidos por posição de grupo (ver R32_PARES em bracket-2026.ts)
 *   R16 (89-96):
 *     89 = W74 × W77   90 = W73 × W75   91 = W76 × W78   92 = W79 × W80
 *     93 = W83 × W84   94 = W81 × W82   95 = W86 × W88   96 = W85 × W87
 *   QF (97-100):
 *     97 = W89 × W90   98 = W93 × W94   99 = W91 × W92   100 = W95 × W96
 *   SF (101-102):
 *     101 = W97 × W98   102 = W99 × W100
 *   Final (104): W101 × W102   (Jogo 103 = 3º lugar, NÃO usado no bolão)
 *
 * Lados do bracket (estilo Copa, final ao centro):
 *
 *   Lado esquerdo (R32):  74, 77, 73, 75, 83, 84, 81, 82
 *     → R16:  89 (74×77), 90 (73×75), 93 (83×84), 94 (81×82)
 *     → QF:   97 (89×90), 98 (93×94)
 *     → SF:   101 (97×98)
 *
 *   Lado direito (R32):   76, 78, 79, 80, 86, 88, 85, 87
 *     → R16:  91 (76×78), 92 (79×80), 95 (86×88), 96 (85×87)
 *     → QF:   99 (91×92), 100 (95×96)
 *     → SF:   102 (99×100)
 */

export type FaseMata = "r32" | "r16" | "qf" | "sf" | "final";

export type NoMataMata = {
  jogo: number; // número FIFA do jogo (73..104)
  fase: FaseMata;
  ladoEsquerdo: boolean; // true = metade esquerda do bracket
  // Para r16/qf/sf/final: números dos jogos cujos vencedores se enfrentam.
  // Para r32: undefined (vem de R32_PARES).
  origemJogos?: [number, number];
};

/** Ordem de exibição vertical de cada lado (cima → baixo). */
export const R32_ESQUERDO_ORDEM = [74, 77, 73, 75, 83, 84, 81, 82] as const;
export const R32_DIREITO_ORDEM = [76, 78, 79, 80, 86, 88, 85, 87] as const;

export const R16: NoMataMata[] = [
  // ESQUERDA
  { jogo: 89, fase: "r16", ladoEsquerdo: true,  origemJogos: [74, 77] },
  { jogo: 90, fase: "r16", ladoEsquerdo: true,  origemJogos: [73, 75] },
  { jogo: 93, fase: "r16", ladoEsquerdo: true,  origemJogos: [83, 84] },
  { jogo: 94, fase: "r16", ladoEsquerdo: true,  origemJogos: [81, 82] },
  // DIREITA
  { jogo: 91, fase: "r16", ladoEsquerdo: false, origemJogos: [76, 78] },
  { jogo: 92, fase: "r16", ladoEsquerdo: false, origemJogos: [79, 80] },
  { jogo: 95, fase: "r16", ladoEsquerdo: false, origemJogos: [86, 88] },
  { jogo: 96, fase: "r16", ladoEsquerdo: false, origemJogos: [85, 87] },
];

export const QF: NoMataMata[] = [
  // ESQUERDA
  { jogo: 97, fase: "qf", ladoEsquerdo: true,  origemJogos: [89, 90] },
  { jogo: 98, fase: "qf", ladoEsquerdo: true,  origemJogos: [93, 94] },
  // DIREITA
  { jogo: 99,  fase: "qf", ladoEsquerdo: false, origemJogos: [91, 92] },
  { jogo: 100, fase: "qf", ladoEsquerdo: false, origemJogos: [95, 96] },
];

export const SF: NoMataMata[] = [
  { jogo: 101, fase: "sf", ladoEsquerdo: true,  origemJogos: [97, 98] },
  { jogo: 102, fase: "sf", ladoEsquerdo: false, origemJogos: [99, 100] },
];

export const FINAL: NoMataMata = {
  jogo: 104,
  fase: "final",
  ladoEsquerdo: true,
  origemJogos: [101, 102],
};

/** Mapa jogo → label de fase legível (para o badge "Jogo NN"). */
export function labelJogo(jogo: number): string {
  if (jogo === 104) return "Final"; // a final NÃO mostra número
  return `Jogo ${jogo}`;
}
