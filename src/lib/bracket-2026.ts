/**
 * Estrutura oficial do bracket da Copa do Mundo FIFA 2026.
 *
 * 16 pares do Round of 32 com posições abstratas:
 *  - 1X = primeiro colocado do grupo X
 *  - 2X = segundo colocado do grupo X
 *  - 3ABCDF = um dos 8 melhores terceiros, vindo de A/B/C/D ou F
 *
 * Fonte: FIFA Worldcup 2026 bracket structure (sorteio 05/dez/2025).
 *
 * Os pares estão ordenados pelo bracket: matches 1-8 (chave superior /
 * lado esquerdo do bracket visual) e 9-16 (chave inferior / lado direito).
 * R16 (oitavas) pareia: R32-1 vs R32-2 → R16-1, R32-3 vs R32-4 → R16-2,
 * etc. — formato bracket clássico.
 */

import type { Grupo } from "@/types/database";
import { classificadosParaMataMata, type StatsTime, type JogoFinalizado } from "./classification";

export type SlotPosicao =
  | { tipo: "1"; grupo: Grupo }
  | { tipo: "2"; grupo: Grupo }
  | { tipo: "3"; grupos: Grupo[] }; // terceiro vindo de um dos N grupos

export type ParR32 = {
  ordem: number; // 1..16, posição no bracket
  ladoEsquerdo: boolean; // true se na metade esquerda do bracket
  casa: SlotPosicao;
  fora: SlotPosicao;
};

export const R32_PARES: ParR32[] = [
  // Lado esquerdo (chave superior do bracket — 8 matches)
  { ordem: 1, ladoEsquerdo: true, casa: { tipo: "1", grupo: "A" }, fora: { tipo: "3", grupos: ["C", "E", "F", "H", "I"] } },
  { ordem: 2, ladoEsquerdo: true, casa: { tipo: "1", grupo: "C" }, fora: { tipo: "2", grupo: "F" } },
  { ordem: 3, ladoEsquerdo: true, casa: { tipo: "1", grupo: "E" }, fora: { tipo: "3", grupos: ["A", "B", "C", "D", "F"] } },
  { ordem: 4, ladoEsquerdo: true, casa: { tipo: "2", grupo: "A" }, fora: { tipo: "2", grupo: "B" } },
  { ordem: 5, ladoEsquerdo: true, casa: { tipo: "1", grupo: "B" }, fora: { tipo: "3", grupos: ["E", "F", "G", "I", "J"] } },
  { ordem: 6, ladoEsquerdo: true, casa: { tipo: "1", grupo: "F" }, fora: { tipo: "2", grupo: "C" } },
  { ordem: 7, ladoEsquerdo: true, casa: { tipo: "1", grupo: "D" }, fora: { tipo: "3", grupos: ["B", "E", "F", "I", "J"] } },
  { ordem: 8, ladoEsquerdo: true, casa: { tipo: "2", grupo: "D" }, fora: { tipo: "2", grupo: "G" } },
  // Lado direito (chave inferior do bracket — 8 matches)
  { ordem: 9, ladoEsquerdo: false, casa: { tipo: "1", grupo: "G" }, fora: { tipo: "3", grupos: ["A", "E", "H", "I", "J"] } },
  { ordem: 10, ladoEsquerdo: false, casa: { tipo: "1", grupo: "H" }, fora: { tipo: "2", grupo: "J" } },
  { ordem: 11, ladoEsquerdo: false, casa: { tipo: "1", grupo: "I" }, fora: { tipo: "3", grupos: ["C", "D", "F", "G", "H"] } },
  { ordem: 12, ladoEsquerdo: false, casa: { tipo: "2", grupo: "E" }, fora: { tipo: "2", grupo: "I" } },
  { ordem: 13, ladoEsquerdo: false, casa: { tipo: "1", grupo: "J" }, fora: { tipo: "2", grupo: "H" } },
  { ordem: 14, ladoEsquerdo: false, casa: { tipo: "1", grupo: "L" }, fora: { tipo: "3", grupos: ["E", "H", "I", "J", "K"] } },
  { ordem: 15, ladoEsquerdo: false, casa: { tipo: "1", grupo: "K" }, fora: { tipo: "3", grupos: ["D", "E", "I", "J", "L"] } },
  { ordem: 16, ladoEsquerdo: false, casa: { tipo: "2", grupo: "K" }, fora: { tipo: "2", grupo: "L" } },
];

/**
 * Resolve uma posição abstrata (1A, 2C, 3ABCDF) em um time concreto,
 * dado os times classificados.
 *
 * Retorna null se o time ainda não foi definido (group stage incompleto).
 */
export function resolverSlot(
  slot: SlotPosicao,
  primeiros: Map<Grupo, StatsTime>,
  segundos: Map<Grupo, StatsTime>,
  terceirosOrdenados: StatsTime[], // já ranqueados pelos critérios FIFA
  jaAtribuidos: Set<string>, // ids de terceiros já alocados a outros slots
): StatsTime | null {
  if (slot.tipo === "1") return primeiros.get(slot.grupo) ?? null;
  if (slot.tipo === "2") return segundos.get(slot.grupo) ?? null;
  // tipo === "3": pega o melhor terceiro que pertence a um dos grupos válidos
  // e que ainda não foi atribuído a outro slot
  for (const t of terceirosOrdenados) {
    if (slot.grupos.includes(t.grupo) && !jaAtribuidos.has(t.time_id)) {
      return t;
    }
  }
  return null;
}

export type ParR32Resolvido = ParR32 & {
  casaTime: StatsTime | null;
  foraTime: StatsTime | null;
};

/**
 * Resolve o bracket completo do R32 a partir dos resultados da fase de grupos.
 */
export function resolverBracketR32(jogos: JogoFinalizado[]): ParR32Resolvido[] {
  const c = classificadosParaMataMata(jogos);
  const primeiros = new Map(c.primeiros.map((t) => [t.grupo, t]));
  const segundos = new Map(c.segundos.map((t) => [t.grupo, t]));
  const terceiros = c.terceirosClassificados; // 8 melhores, ordenados

  const jaAtribuidos = new Set<string>();
  const resultado: ParR32Resolvido[] = [];

  for (const par of R32_PARES) {
    const casaTime = resolverSlot(par.casa, primeiros, segundos, terceiros, jaAtribuidos);
    if (casaTime && par.casa.tipo === "3") jaAtribuidos.add(casaTime.time_id);
    const foraTime = resolverSlot(par.fora, primeiros, segundos, terceiros, jaAtribuidos);
    if (foraTime && par.fora.tipo === "3") jaAtribuidos.add(foraTime.time_id);
    resultado.push({ ...par, casaTime, foraTime });
  }

  return resultado;
}

/** Label legível pra uma posição abstrata (1A, 2C, 3ABCDF). */
export function labelPosicao(slot: SlotPosicao): string {
  if (slot.tipo === "1") return `1º ${slot.grupo}`;
  if (slot.tipo === "2") return `2º ${slot.grupo}`;
  return `3º (${slot.grupos.join("/")})`;
}
