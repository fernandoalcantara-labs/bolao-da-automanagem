/**
 * Texto único usado em todos os pontos de compartilhamento do bolão:
 * - Botão "Compartilhar" no header (sidebar / mobile header)
 * - Botão "Compartilhar" da página /regras
 *
 * Decidimos que TODO compartilhamento usa a MESMA mensagem completa,
 * sempre incluindo o link principal do site — a pessoa precisa ter
 * como entrar.
 */

import { formatCurrency } from "@/lib/utils";
import { normalizarPontuacao } from "@/lib/scoring";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";

export type ShareInfoCompleto = {
  nomeBolao: string;
  totalArrecadado: number;
  valorAposta: number;
  appUrl: string;
  pontuacao: PontuacaoConfig;
  rateio: RateioConfig;
  pixChave: string;
  pixNome: string;
};

/**
 * Mensagem completa do bolão — usada em TODOS os botões de compartilhar.
 * Inclui pontuação, rateio, pix + link do site.
 */
export function shareMessageCompleto(info: ShareInfoCompleto): string {
  const p = normalizarPontuacao(info.pontuacao);
  return [
    `🏆 *${info.nomeBolao}* · Copa do Mundo FIFA 2026`,
    "",
    `💰 *Prêmio estimado*: ${formatCurrency(info.totalArrecadado)}`,
    `💵 *Valor da aposta*: ${formatCurrency(info.valorAposta)}`,
    "",
    `*Pontuação (fase de grupos)*:`,
    `🎯 Placar exato: ${p.placar_exato} pts`,
    `✅ Acertou vencedor/empate: ${p.vencedor_ou_empate} pts`,
    "",
    `*Mata-mata*:`,
    `🎫 16 Avos: ${p.pts_r32} pts por acerto`,
    `⚽ Oitavas / Quartas / Semi / Final: ${p.pts_oitavas} / ${p.pts_quartas} / ${p.pts_semi} / ${p.pts_final} pts`,
    `🥇 Campeão: ${p.campeao} pts | 🥈 Vice: ${p.vice} pts`,
    `⚽ Artilheiro: ${p.artilheiro} pts`,
    "",
    `*Rateio*:`,
    `🥇 1º: ${info.rateio.primeiro}%  |  🥈 2º: ${info.rateio.segundo}%  |  🥉 3º: ${info.rateio.terceiro}%`,
    `🐢 Lanterninha: ${info.rateio.lanterninha}%${
      info.rateio.artilheiro > 0 ? `  |  ⚽ Artilheiro: ${info.rateio.artilheiro}%` : ""
    }`,
    "",
    `*Pagamento PIX*:`,
    info.pixChave,
    `(${info.pixNome})`,
    "",
    `Acessa: ${info.appUrl}`,
  ].join("\n");
}
