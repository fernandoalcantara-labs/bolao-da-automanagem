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
  // Padrão "fase alcançada" (pts_*). pts_r32 = classificou ao R32 (16 Avos).
  pts_r32: 2,
  pts_oitavas: 8,
  pts_quartas: 12,
  pts_semi: 16,
  pts_final: 20,
  vice: 24,
  campeao: 40,
  artilheiro: 24,
  // Legados preservados (rollback / configs antigas).
  mata_16avos: 8,
  mata_8avos: 12,
  mata_quartas: 16,
  mata_semi: 20,
};

/**
 * Normaliza uma config de pontuação pro padrão pts_* (fase alcançada),
 * preenchendo a partir dos campos legados POR SIGNIFICADO (os legados estão
 * deslocados uma fase). Idempotente: configs já no padrão novo passam intactas.
 *
 * Mapa semântico:
 *   pts_oitavas ← mata_16avos   (chegou às oitavas)
 *   pts_quartas ← mata_8avos    (chegou às quartas)
 *   pts_semi    ← mata_quartas  (chegou à semi)
 *   pts_final   ← mata_semi     (chegou à final)
 *   pts_r32     ← (novo)        default 2
 */
export function normalizarPontuacao(cfg: Partial<PontuacaoConfig> | null | undefined): PontuacaoConfig {
  const c = cfg ?? {};
  return {
    placar_exato: c.placar_exato ?? PONTUACAO_DEFAULT.placar_exato,
    vencedor_ou_empate: c.vencedor_ou_empate ?? PONTUACAO_DEFAULT.vencedor_ou_empate,
    pts_r32: c.pts_r32 ?? 2,
    pts_oitavas: c.pts_oitavas ?? c.mata_16avos ?? 8,
    pts_quartas: c.pts_quartas ?? c.mata_8avos ?? 12,
    pts_semi: c.pts_semi ?? c.mata_quartas ?? 16,
    pts_final: c.pts_final ?? c.mata_semi ?? 20,
    vice: c.vice ?? PONTUACAO_DEFAULT.vice,
    campeao: c.campeao ?? PONTUACAO_DEFAULT.campeao,
    artilheiro: c.artilheiro ?? PONTUACAO_DEFAULT.artilheiro,
    // mantém legados pra rollback/compat
    mata_16avos: c.mata_16avos,
    mata_8avos: c.mata_8avos,
    mata_quartas: c.mata_quartas,
    mata_semi: c.mata_semi,
  };
}

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
  // Normaliza defensivamente — garante pts_* mesmo se vier config legada.
  const c = normalizarPontuacao(cfg);
  // Mapeamento 1:1 por "fase alcançada":
  switch (fase) {
    case "16avos":
      return c.pts_r32;     // classificou ao R32 (16 Avos)
    case "8avos":
      return c.pts_oitavas; // chegou às oitavas
    case "quartas":
      return c.pts_quartas; // chegou às quartas
    case "semi":
      return c.pts_semi;    // chegou à semi
    case "final":
      return c.pts_final;   // chegou à final
    case "vice":
      return c.vice;        // foi vice
    case "campeao":
      return c.campeao;     // foi campeão
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
  // Palpite de "campeao" acerta SOMENTE se o time foi o campeão REAL.
  // (3D) NÃO existe mais downgrade campeão→vice: se o time só chegou à
  // final (virou vice), o palpite de campeão vale 0. O vice do usuário é
  // tratado à parte (timeVicePalpitado + award aditivo), pois é o SEGUNDO
  // finalista — não o campeão "rebaixado".
  if (palpiteFase === "campeao") {
    if (faseAlcancadaReal === "campeao") {
      return { acertou: true, faseEfetiva: "campeao" };
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

/**
 * (3D) Vice do APOSTADOR = o seu SEGUNDO finalista: o time que ele marcou
 * em "final" e que NÃO é o seu palpite de "campeao". Só existe quando ele
 * tem exatamente 2 finalistas E definiu 1 campeão (entre eles). Caso
 * contrário, indefinido (null).
 *
 * O award de vice é ADITIVO (não substitui nada) e só pontua se esse time
 * for o vice REAL — calculado fora daqui (precisa de faseAlcancada + trava
 * "campeão decidido").
 */
export function timeVicePalpitado(
  finalPicks: string[],
  campeaoPick: string | null,
): string | null {
  if (!campeaoPick) return null;
  const candidatos = finalPicks.filter((t) => t !== campeaoPick);
  return candidatos.length === 1 ? candidatos[0] : null;
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
