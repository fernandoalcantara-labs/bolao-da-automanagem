/**
 * Engine de pontuação do Bolão.
 *
 * Regras (todas configuráveis pelo admin):
 *  - Fase de grupos:
 *      placar_exato        = 5 pts
 *      vencedor_ou_empate  = 2 pts (acertou só o resultado, não o placar)
 *      errou               = 0
 *  - Mata-mata: pontos por SELEÇÃO acertada como classificada para a fase.
 *      16avos   8 pts (até 16 acertos)
 *      8avos   12 pts (até 8)
 *      quartas 16 pts (até 4)
 *      semi    20 pts (até 2)
 *      vice    24 pts (1)
 *      campeao 40 pts (1)
 *  - Artilheiro: 24 pts.
 */

import type { PontuacaoConfig, FasePalpiteMata } from "@/types/database";

export const PONTUACAO_DEFAULT: PontuacaoConfig = {
  placar_exato: 5,
  vencedor_ou_empate: 2,
  mata_16avos: 8,
  mata_8avos: 12,
  mata_quartas: 16,
  mata_semi: 20,
  vice: 24,
  campeao: 40,
  artilheiro: 24,
};

export type Placar = { casa: number; fora: number };
export type ResultadoPalpite = "exato" | "vencedor_ou_empate" | "errado";

export function avaliarPalpiteGrupo(
  palpite: Placar,
  resultado: Placar,
): ResultadoPalpite {
  if (palpite.casa === resultado.casa && palpite.fora === resultado.fora) {
    return "exato";
  }
  const sinalPalpite = Math.sign(palpite.casa - palpite.fora);
  const sinalResultado = Math.sign(resultado.casa - resultado.fora);
  if (sinalPalpite === sinalResultado) return "vencedor_ou_empate";
  return "errado";
}

export function pontosPalpiteGrupo(
  palpite: Placar,
  resultado: Placar,
  cfg: PontuacaoConfig = PONTUACAO_DEFAULT,
): number {
  switch (avaliarPalpiteGrupo(palpite, resultado)) {
    case "exato":
      return cfg.placar_exato;
    case "vencedor_ou_empate":
      return cfg.vencedor_ou_empate;
    default:
      return 0;
  }
}

/**
 * Pontos por fase do palpite (semantics: o usuário palpita que o time
 * CHEGA até essa fase do torneio).
 *
 * A pontuação progride a cada fase superada — palpitar que o time
 * "chega às oitavas" (passou do R32) vale `mata_16avos` (8 pts), pois
 * o prompt usa "acerto em 16 avos" para significar "acertar quem ganhou
 * a partida do R32". A configuração mantém os nomes do prompt para
 * facilitar edição pelo admin.
 *
 * Importante: "campeao" e "vice" são MUTUAMENTE EXCLUSIVOS. Se o usuário
 * palpitou "campeao" e o time foi vice, o resultado é "vice" (24 pts).
 */
export function pontosPalpiteMata(
  fase: FasePalpiteMata | "vice",
  cfg: PontuacaoConfig = PONTUACAO_DEFAULT,
): number {
  switch (fase) {
    case "16avos":
      return cfg.mata_16avos; // raramente usado — 16avos é a classificação direta
    case "8avos":
      return cfg.mata_16avos; // 8 pts: time passou do R32 e chegou às oitavas
    case "quartas":
      return cfg.mata_8avos;  // 12 pts: time passou das oitavas
    case "semi":
      return cfg.mata_quartas; // 16 pts: time passou das quartas
    case "final":
      return cfg.mata_semi;   // 20 pts: time passou da semi (= chegou à final)
    case "vice":
      return cfg.vice;        // 24 pts: time foi vice
    case "campeao":
      return cfg.campeao;     // 40 pts: time foi campeão
  }
}

/**
 * Dado o palpite (qual time o usuário marcou para qual fase) e a realidade
 * (até onde o time foi de fato), retorna a fase para a qual o acerto vale.
 *
 * Retorna `null` quando não há acerto (o time não chegou à fase palpitada).
 *
 * Detalhe sutil: se o usuário marcou um time como "campeao" e ele perdeu a
 * final, o usuário ainda ganha como vice (a marca de "campeao" implica que
 * o time também passa pelas fases anteriores). Por isso a fase efetiva é
 * `min(palpite, real)`.
 */
const ORDEM_FASES: Record<FasePalpiteMata, number> = {
  "16avos": 1,
  "8avos": 2,
  "quartas": 3,
  "semi": 4,
  "final": 5,
  "campeao": 6,
};

const FASE_PARA_ORDEM_REAL: Record<string, number> = {
  // Onde o time PAROU: a fase para a qual ele foi eliminado / venceu.
  "grupos": 0,        // não passou da fase de grupos
  "16avos": 1,        // chegou aos 16 avos (= classificou-se ao R32)
  "8avos": 2,
  "quartas": 3,
  "semi": 4,
  "final": 5,         // chegou à final mas perdeu
  "campeao": 6,       // foi campeão
};

export function classificarPalpiteMata(
  palpiteFase: FasePalpiteMata,
  faseAlcancadaReal: FasePalpiteMata | "grupos",
): { acertou: boolean; faseEfetiva: FasePalpiteMata | "vice" | null } {
  // Caso especial: palpitou "campeao" → acerta se o time foi campeão (40 pts)
  // ou vice (24 pts). Senão, errou.
  if (palpiteFase === "campeao") {
    if (faseAlcancadaReal === "campeao") {
      return { acertou: true, faseEfetiva: "campeao" };
    }
    if (faseAlcancadaReal === "final") {
      return { acertou: true, faseEfetiva: "vice" };
    }
    return { acertou: false, faseEfetiva: null };
  }
  // Demais fases: acertou se o time chegou pelo menos até a fase palpitada.
  const ordemP = ORDEM_FASES[palpiteFase];
  const ordemR = FASE_PARA_ORDEM_REAL[faseAlcancadaReal];
  if (ordemR < ordemP) {
    return { acertou: false, faseEfetiva: null };
  }
  return { acertou: true, faseEfetiva: palpiteFase };
}

export type TotaisUsuario = {
  pontos_grupos: number;
  pontos_mata: number;
  pontos_artilheiro: number;
  total: number;
};

export function somarTotais(parts: Partial<TotaisUsuario>): TotaisUsuario {
  const g = parts.pontos_grupos ?? 0;
  const m = parts.pontos_mata ?? 0;
  const a = parts.pontos_artilheiro ?? 0;
  return { pontos_grupos: g, pontos_mata: m, pontos_artilheiro: a, total: g + m + a };
}
