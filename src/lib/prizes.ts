import type { RateioConfig } from "@/types/database";

export const RATEIO_DEFAULT: RateioConfig = {
  primeiro: 65,
  segundo: 20,
  terceiro: 10,
  lanterninha: 5,
  artilheiro: 0,
};

export type RankingItem = { user_id: string; nome: string; pontos: number };

export type Premiacao = {
  primeiro: { user_ids: string[]; valor_total: number; valor_por_pessoa: number };
  segundo: { user_ids: string[]; valor_total: number; valor_por_pessoa: number };
  terceiro: { user_ids: string[]; valor_total: number; valor_por_pessoa: number };
  lanterninha: { user_ids: string[]; valor_total: number; valor_por_pessoa: number };
  artilheiro: { user_ids: string[]; valor_total: number; valor_por_pessoa: number };
};

/**
 * Calcula o rateio dado o ranking final + rateio + arrecadação.
 *
 * Regras:
 *  - Cada posição (1º, 2º, 3º) divide o prêmio entre quem está empatado nela.
 *  - Lanterninha = quem tem MENOS pontos. Empate divide igualmente.
 *  - Artilheiro = lista de user_ids que acertaram. Divide igualmente entre todos.
 *  - Quando alguém é simultaneamente top-3 e lanterninha (poucos participantes),
 *    aplica-se apenas o prêmio MAIOR.
 *  - Se o rateio[posicao] = 0, ninguém ganha nessa categoria (card oculto na UI).
 */
export function calcularRateio(
  ranking: RankingItem[],
  rateio: RateioConfig,
  totalArrecadado: number,
  acertaramArtilheiro: string[],
): Premiacao {
  const valorBruto = (pct: number) => (totalArrecadado * pct) / 100;

  // Quem está em 1º, 2º, 3º (por valor de pontos, com empate)
  const ordenado = [...ranking].sort((a, b) => b.pontos - a.pontos);

  function posicaoEmpatada(idx: number): string[] {
    if (ordenado.length <= idx) return [];
    const pts = ordenado[idx].pontos;
    // O 2º real é o 1º grupo de pontos diferente do líder, etc.
    // Para simplificar e atender o caso "empate em 1º divide", procuramos
    // quem tem exatamente esses pontos como N-ésimo grupo distinto.
    const grupos: number[] = [];
    for (const r of ordenado) {
      if (grupos.length === 0 || grupos[grupos.length - 1] !== r.pontos) {
        grupos.push(r.pontos);
      }
      if (grupos.length === idx + 1) break;
    }
    const ptsAlvo = grupos[idx];
    return ordenado.filter((r) => r.pontos === ptsAlvo).map((r) => r.user_id);
  }

  const primeiroIds = posicaoEmpatada(0);
  const segundoIds = posicaoEmpatada(1);
  const terceiroIds = posicaoEmpatada(2);

  // Lanterninha = quem tem menor pontuação
  const menorPontos = ordenado.length ? ordenado[ordenado.length - 1].pontos : 0;
  let lanternaIds = ordenado.filter((r) => r.pontos === menorPontos).map((r) => r.user_id);

  // Evita conflito: quem já está em top-3 não pode ser lanterninha também.
  // Aplica apenas o prêmio maior — top-3 é maior que lanterninha.
  const top3Ids = new Set([...primeiroIds, ...segundoIds, ...terceiroIds]);
  lanternaIds = lanternaIds.filter((id) => !top3Ids.has(id));

  function dividir(ids: string[], pct: number) {
    const valor_total = valorBruto(pct);
    const valor_por_pessoa = ids.length > 0 ? valor_total / ids.length : 0;
    return { user_ids: ids, valor_total, valor_por_pessoa };
  }

  return {
    primeiro: dividir(primeiroIds, rateio.primeiro),
    segundo: dividir(segundoIds, rateio.segundo),
    terceiro: dividir(terceiroIds, rateio.terceiro),
    lanterninha: dividir(lanternaIds, rateio.lanterninha),
    artilheiro: dividir(acertaramArtilheiro, rateio.artilheiro),
  };
}

export function somaRateio(r: RateioConfig): number {
  return r.primeiro + r.segundo + r.terceiro + r.lanterninha + r.artilheiro;
}

export function rateioValido(r: RateioConfig): boolean {
  return somaRateio(r) === 100;
}
