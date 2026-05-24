/**
 * Lógica pura de transição de picks do mata-mata.
 *
 * Extraída do componente `mata-mata-form.tsx` pra ficar testável (PARTE 2
 * do PROMPT_FIX_GRUPOS).
 *
 * Regras invariantes:
 *  - Ao escolher um vencedor numa fase F, o adversário daquele MESMO
 *    confronto deve sair de F e de todas as fases POSTERIORES.
 *  - Se um time é escolhido pra uma fase tardia (ex: "semi"), ele é
 *    automaticamente adicionado nas fases anteriores (consistência:
 *    quem chega na semi necessariamente passou pelas oitavas e quartas).
 *  - Toggle off de um time numa fase também remove ele das posteriores.
 */

import type { FasePalpiteMata } from "@/types/database";
import type { ParR32Resolvido } from "./bracket-2026";
import { R16, QF, SF, FINAL, type NoMataMata } from "./mata-mata-estrutura";

export const ORDEM_FASES: FasePalpiteMata[] = [
  "16avos",
  "8avos",
  "quartas",
  "semi",
  "final",
  "campeao",
];

export type PicksMata = Record<FasePalpiteMata, Set<string>>;

/**
 * Retorna a fase de PICK cujos vencedores são os times marcados no
 * resultado de um JOGO específico do bracket.
 *   - jogos 73-88 (R32)   → "8avos"   (marcar vencedor do R32 = palpite de oitavas)
 *   - jogos 89-96 (R16)   → "quartas"
 *   - jogos 97-100 (QF)   → "semi"
 *   - jogos 101-102 (SF)  → "final"
 *   - jogo 104 (Final)    → "campeao"
 */
export function faseDePickDoJogo(jogo: number): FasePalpiteMata {
  if (jogo >= 73 && jogo <= 88) return "8avos";
  if (jogo >= 89 && jogo <= 96) return "quartas";
  if (jogo >= 97 && jogo <= 100) return "semi";
  if (jogo === 101 || jogo === 102) return "final";
  if (jogo === 104) return "campeao";
  return "16avos"; // fallback (não usado)
}

/**
 * Retorna os nós (confrontos) cujos vencedores avançam para `fase`.
 * Necessário pra resolver o "adversário" num confronto da fase.
 */
function nosQueAlimentam(fase: FasePalpiteMata): NoMataMata[] {
  switch (fase) {
    case "quartas":
      return R16; // vencedor de R16 vai pras quartas
    case "semi":
      return QF; // vencedor de QF vai pra semi
    case "final":
      return SF; // vencedor de SF vai pra final
    case "campeao":
      return [FINAL]; // vencedor da Final vira campeão
    default:
      return []; // 8avos = R32, tratado direto via r32 (par.casa/fora)
  }
}

/**
 * Vencedor escolhido pelo usuário num jogo específico do mata-mata.
 * Recursão: pra fases superiores, resolve os vencedores dos jogos de origem.
 * Retorna null se o user ainda não escolheu (palpites incompletos).
 */
export function vencedorDoJogo(
  jogo: number,
  picks: PicksMata,
  r32PorJogo: Map<number, ParR32Resolvido>,
): string | null {
  // R32 (73-88): vencedor = time marcado em "8avos"
  if (jogo >= 73 && jogo <= 88) {
    const par = r32PorJogo.get(jogo);
    if (!par) return null;
    const a = par.casaTime?.time_id;
    const b = par.foraTime?.time_id;
    if (a && picks["8avos"].has(a)) return a;
    if (b && picks["8avos"].has(b)) return b;
    return null;
  }
  // Fases superiores: pega os 2 vencedores dos jogos de origem e olha
  // qual deles está marcado no pick da fase atual
  const no = [...R16, ...QF, ...SF, FINAL].find((n) => n.jogo === jogo);
  if (!no || !no.origemJogos) return null;
  const fasePick = faseDePickDoJogo(jogo);
  const [oa, ob] = no.origemJogos;
  const va = vencedorDoJogo(oa, picks, r32PorJogo);
  const vb = vencedorDoJogo(ob, picks, r32PorJogo);
  if (va && picks[fasePick].has(va)) return va;
  if (vb && picks[fasePick].has(vb)) return vb;
  return null;
}

/**
 * Adversário de `timeId` num confronto da fase `fase`:
 *   - 8avos: adversário direto no par do R32
 *   - quartas/semi/final: vencedor (escolhido pelo user) do OUTRO jogo de
 *     origem do confronto onde `timeId` está
 *   - campeao: o outro finalista (vencedor do outro SF)
 *
 * Retorna null se não há adversário definido ainda (palpites incompletos)
 * OU se `timeId` não é vencedor escolhido em fase anterior pra estar nesta.
 */
export function encontrarAdversario(
  fase: FasePalpiteMata,
  timeId: string,
  picks: PicksMata,
  r32: ParR32Resolvido[],
): string | null {
  // Indexa R32 por matchNumber
  const r32PorJogo = new Map<number, ParR32Resolvido>();
  for (const p of r32) r32PorJogo.set(p.matchNumber, p);

  // 8avos: adversário direto vem do par do R32
  if (fase === "8avos") {
    for (const par of r32) {
      const a = par.casaTime?.time_id;
      const b = par.foraTime?.time_id;
      if (a === timeId) return b ?? null;
      if (b === timeId) return a ?? null;
    }
    return null;
  }

  // Outras fases: percorre os nós que alimentam `fase` e procura aquele
  // onde `timeId` é um dos vencedores das origens. O adversário é o
  // vencedor do OUTRO jogo de origem.
  const nos = nosQueAlimentam(fase);
  for (const no of nos) {
    if (!no.origemJogos) continue;
    const [oa, ob] = no.origemJogos;
    const va = vencedorDoJogo(oa, picks, r32PorJogo);
    const vb = vencedorDoJogo(ob, picks, r32PorJogo);
    if (va === timeId) return vb ?? null;
    if (vb === timeId) return va ?? null;
  }
  return null;
}

/** Conjunto de time_ids que estão no R32 resolvido (casa + fora de cada par). */
export function timesValidosR32(r32: ParR32Resolvido[]): Set<string> {
  const s = new Set<string>();
  for (const p of r32) {
    if (p.casaTime?.time_id) s.add(p.casaTime.time_id);
    if (p.foraTime?.time_id) s.add(p.foraTime.time_id);
  }
  return s;
}

/**
 * Remove picks "fantasma": times marcados em alguma fase do mata-mata que
 * NÃO estão mais no R32 atual do usuário. Isso acontece quando o user troca
 * palpites de grupos DEPOIS de ter marcado um vencedor — o time sai do R32
 * mas o pick fica órfão em `palpites_mata`, inflando a contagem e travando
 * o limite da fase (bug: "Limite atingido em Oitavas" com só 15 válidos).
 *
 * Como o usuário só consegue clicar em times que ESTÃO no R32 resolvido,
 * qualquer pick fora desse conjunto é necessariamente órfão. "16avos" é
 * mantido intacto (não é palpitado). Se o R32 ainda não resolveu nenhum
 * time (size 0, palpites de grupos vazios), não filtra nada.
 */
export function filtrarPicksPorR32(picks: PicksMata, r32: ParR32Resolvido[]): PicksMata {
  const validos = timesValidosR32(r32);
  if (validos.size === 0) return picks;
  const out: PicksMata = {
    "16avos": new Set(picks["16avos"]),
    "8avos": new Set(),
    "quartas": new Set(),
    "semi": new Set(),
    "final": new Set(),
    "campeao": new Set(),
  };
  for (const fase of ORDEM_FASES) {
    if (fase === "16avos") continue;
    for (const t of picks[fase]) {
      if (validos.has(t)) out[fase].add(t);
    }
  }
  return out;
}

export type ResultadoPick =
  | { ok: true; picks: PicksMata }
  | { ok: false; motivo: "limite_atingido"; fase: FasePalpiteMata; quantidade: number };

/** Quantidade máxima de picks por fase (pra evitar usuário marcar 17 times nas oitavas). */
const LIMITE_POR_FASE: Record<FasePalpiteMata, number> = {
  "16avos": 32, // não palpitado (vem do regulamento)
  "8avos": 16,
  "quartas": 8,
  "semi": 4,
  "final": 2,
  "campeao": 1,
};

/**
 * Aplica um pick (toggle) num conjunto imutável de picks e retorna o
 * NOVO estado. Lógica pura e testável.
 *
 * Comportamento:
 *  - Se `timeId` já está marcado em `fase`: REMOVE de `fase` e fases
 *    posteriores (toggle off).
 *  - Se NÃO está: ADICIONA. Antes, REMOVE o adversário do mesmo confronto
 *    (que sai de `fase` e posteriores — trava dura da exclusividade).
 *    Também adiciona o time em fases anteriores (consistência cascata).
 *  - Se a fase está cheia (atingiu `LIMITE_POR_FASE`) E `fase !== "campeao"`,
 *    retorna { ok: false } pra UI tratar com toast.
 *  - Em "campeao", sempre substitui (não tem limite — só 1 campeão).
 */
export function aplicarPick(
  picks: PicksMata,
  fase: FasePalpiteMata,
  timeId: string,
  r32: ParR32Resolvido[],
): ResultadoPick {
  // Clona todos os sets
  const next: PicksMata = {
    "16avos": new Set(picks["16avos"]),
    "8avos": new Set(picks["8avos"]),
    "quartas": new Set(picks["quartas"]),
    "semi": new Set(picks["semi"]),
    "final": new Set(picks["final"]),
    "campeao": new Set(picks["campeao"]),
  };

  const jaTem = picks[fase].has(timeId);
  const idx = ORDEM_FASES.indexOf(fase);

  if (jaTem) {
    // Toggle off: remove desta fase e de todas as posteriores
    for (let i = idx; i < ORDEM_FASES.length; i++) {
      next[ORDEM_FASES[i]].delete(timeId);
    }
    return { ok: true, picks: next };
  }

  // Toggle on:
  // 1) Remove o adversário do mesmo confronto ANTES de avaliar limite.
  //    Isso garante exclusividade real (PARTE 2 — trava dura).
  const adv = encontrarAdversario(fase, timeId, picks, r32);
  if (adv) {
    for (let i = idx; i < ORDEM_FASES.length; i++) {
      next[ORDEM_FASES[i]].delete(adv);
    }
  }

  // 2) Avalia limite
  const limite = LIMITE_POR_FASE[fase];
  if (next[fase].size >= limite) {
    if (fase === "campeao") {
      // Campeão sempre substitui (não tem limite real — 1 só)
      next[fase] = new Set([timeId]);
    } else {
      return { ok: false, motivo: "limite_atingido", fase, quantidade: limite };
    }
  } else {
    next[fase].add(timeId);
  }

  // 3) Cascata pra trás: adiciona o time em fases ANTERIORES.
  //    Não inclui "16avos" (não palpitado) — só da fase atual pra trás
  //    até "8avos" (índice 1).
  for (let i = 1; i < idx; i++) {
    next[ORDEM_FASES[i]].add(timeId);
  }

  return { ok: true, picks: next };
}
