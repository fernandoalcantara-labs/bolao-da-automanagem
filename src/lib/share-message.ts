/**
 * Texto único usado em todos os pontos de compartilhamento do bolão:
 * - Botão "Compartilhar" no header (sidebar / mobile header)
 * - Botão "Compartilhar" da página /regras
 *
 * Decidimos que TODO compartilhamento inclui o link principal do site —
 * a pessoa precisa ter como entrar.
 */

import { formatCurrency } from "@/lib/utils";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";

export type ShareInfo = {
  nomeBolao: string;
  totalArrecadado: number;
  valorAposta: number;
  appUrl: string;
};

export type ShareInfoCompleto = ShareInfo & {
  pontuacao: PontuacaoConfig;
  rateio: RateioConfig;
  pixChave: string;
  pixNome: string;
};

/**
 * Versão curta — usada no botão "Compartilhar" do header.
 * Convida pra entrar no bolão (sem detalhe de pontuação).
 */
export function shareMessageCurta(info: ShareInfo): string {
  return [
    `🏆 *${info.nomeBolao}* · Copa do Mundo FIFA 2026`,
    "",
    `🇧🇷 Bora entrar no bolão!`,
    `💰 *Prêmio estimado*: ${formatCurrency(info.totalArrecadado)}`,
    `💵 *Valor da aposta*: ${formatCurrency(info.valorAposta)}`,
    "",
    `Acessa: ${info.appUrl}`,
  ].join("\n");
}

/**
 * Versão completa — usada na página /regras pra explicar tudo do bolão.
 * Inclui pontuação, rateio, pix + link.
 */
export function shareMessageCompleto(info: ShareInfoCompleto): string {
  return [
    `🏆 *${info.nomeBolao}* · Copa do Mundo FIFA 2026`,
    "",
    `💰 *Prêmio estimado*: ${formatCurrency(info.totalArrecadado)}`,
    `💵 *Valor da aposta*: ${formatCurrency(info.valorAposta)}`,
    "",
    `*Pontuação*:`,
    `🎯 Placar exato: ${info.pontuacao.placar_exato} pts`,
    `✅ Acertou vencedor/empate: ${info.pontuacao.vencedor_ou_empate} pts`,
    `⚽ Mata-mata: 8 / 12 / 16 / 20 pts por fase`,
    `🥇 Campeão: ${info.pontuacao.campeao} pts | 🥈 Vice: ${info.pontuacao.vice} pts`,
    `⚽ Artilheiro: ${info.pontuacao.artilheiro} pts`,
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
