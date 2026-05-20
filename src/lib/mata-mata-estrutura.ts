/**
 * Estrutura oficial de avanço do mata-mata da Copa 2026.
 *
 * Cada partida do mata-mata (jogos 73 a 104) tem um número FIFA fixo e,
 * a partir das oitavas, é definida pelos VENCEDORES de dois jogos anteriores.
 *
 * Fonte: tabela oficial FIFA (Sky Sports / MLSSoccer / NBC Sports, mai/2026).
 *
 * Pareamento (confirmado):
 *   R32 (73-88): definidos por posição de grupo (ver R32_PARES em bracket-2026.ts)
 *   R16 (89-96): 89=W73×W74  90=W75×W76  91=W77×W78  92=W79×W80
 *                93=W81×W82  94=W83×W84  95=W85×W86  96=W87×W88
 *   QF (97-100): 97=W89×W90  98=W93×W94  99=W91×W92  100=W95×W96
 *   SF (101-102): 101=W97×W98  102=W99×W100
 *   Final (104): W101×W102   (Jogo 103 = 3º lugar, NÃO usado no bolão)
 *
 * O lado ESQUERDO do bracket (estilo Copa, final ao centro) contém os
 * jogos cujo caminho leva à semifinal 101; o lado DIREITO leva à 102.
 *
 *   Lado esquerdo (R32):  73, 74, 75, 76, 77, 78, 79, 80
 *     → R16:  89 (73×74), 90 (75×76), 91 (77×78), 92 (79×80)
 *     → QF:   97 (89×90), 99 (91×92)
 *     → SF:   101 (97×99)
 *
 *   Lado direito (R32):   81, 82, 83, 84, 85, 86, 87, 88
 *     → R16:  93 (81×82), 94 (83×84), 95 (85×86), 96 (87×88)
 *     → QF:   98 (93×94), 100 (95×96)
 *     → SF:   102 (98×100)
 *
 * ATENÇÃO: o lado esquerdo emparelha QF como 97=89×90 e 99=91×92, e a SF
 * esquerda é 101=97×99. O lado direito: 98=93×94, 100=95×96, SF 102=98×100.
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
export const R32_ESQUERDO_ORDEM = [73, 74, 75, 76, 77, 78, 79, 80] as const;
export const R32_DIREITO_ORDEM = [81, 82, 83, 84, 85, 86, 87, 88] as const;

export const R16: NoMataMata[] = [
  { jogo: 89, fase: "r16", ladoEsquerdo: true,  origemJogos: [73, 74] },
  { jogo: 90, fase: "r16", ladoEsquerdo: true,  origemJogos: [75, 76] },
  { jogo: 91, fase: "r16", ladoEsquerdo: true,  origemJogos: [77, 78] },
  { jogo: 92, fase: "r16", ladoEsquerdo: true,  origemJogos: [79, 80] },
  { jogo: 93, fase: "r16", ladoEsquerdo: false, origemJogos: [81, 82] },
  { jogo: 94, fase: "r16", ladoEsquerdo: false, origemJogos: [83, 84] },
  { jogo: 95, fase: "r16", ladoEsquerdo: false, origemJogos: [85, 86] },
  { jogo: 96, fase: "r16", ladoEsquerdo: false, origemJogos: [87, 88] },
];

export const QF: NoMataMata[] = [
  { jogo: 97,  fase: "qf", ladoEsquerdo: true,  origemJogos: [89, 90] },
  { jogo: 99,  fase: "qf", ladoEsquerdo: true,  origemJogos: [91, 92] },
  { jogo: 98,  fase: "qf", ladoEsquerdo: false, origemJogos: [93, 94] },
  { jogo: 100, fase: "qf", ladoEsquerdo: false, origemJogos: [95, 96] },
];

export const SF: NoMataMata[] = [
  { jogo: 101, fase: "sf", ladoEsquerdo: true,  origemJogos: [97, 99] },
  { jogo: 102, fase: "sf", ladoEsquerdo: false, origemJogos: [98, 100] },
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
