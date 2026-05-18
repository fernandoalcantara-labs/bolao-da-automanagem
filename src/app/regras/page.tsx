import Link from "next/link";
import { Trophy, Target, Calendar, Wallet, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import { RATEIO_DEFAULT } from "@/lib/prizes";
import { PONTUACAO_DEFAULT } from "@/lib/scoring";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";
import { CompartilharRegras } from "./compartilhar";

export const dynamic = "force-dynamic";

export default async function RegrasPage() {
  const supabase = createClient();
  const [{ data: config }, { count: pagos }] = await Promise.all([
    supabase
      .from("config")
      .select("chave, valor")
      .in("chave", ["pontuacao", "rateio", "pix_chave", "pix_nome", "valor_aposta", "nome_bolao"]),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("pago", true),
  ]);

  const conf = Object.fromEntries((config ?? []).map((c) => [c.chave, c.valor]));
  const pontuacao = (conf.pontuacao as PontuacaoConfig) ?? PONTUACAO_DEFAULT;
  const rateio = (conf.rateio as RateioConfig) ?? RATEIO_DEFAULT;
  const valorAposta = Number(conf.valor_aposta ?? 50);
  const pixChave = String(conf.pix_chave ?? "—");
  const pixNome = String(conf.pix_nome ?? "—");
  const nomeBolao = String(conf.nome_bolao ?? "Bolão da AutoManagem");
  const totalArrecadado = (pagos ?? 0) * valorAposta;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-fredoka text-3xl font-extrabold tracking-tight">📜 Regras do {nomeBolao}</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Valores atualizados em tempo real conforme o admin ajusta a configuração ✨
        </p>
      </header>

      {/* Resumo do prêmio */}
      <Card className="border-2 border-festive-gold-dark/40 gradient-gold shadow-stack-gold">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-900/70">
              💰 Prêmio estimado
            </p>
            <p className="font-fredoka text-4xl font-extrabold text-zinc-900">{formatCurrency(totalArrecadado)}</p>
            <p className="text-xs font-bold text-zinc-900/70">
              {pagos ?? 0} participante(s) × {formatCurrency(valorAposta)}
            </p>
          </div>
          <CompartilharRegras
            texto={gerarTextoCompartilhamento({ nomeBolao, pontuacao, rateio, valorAposta, pixChave, pixNome, totalArrecadado })}
          />
        </CardContent>
      </Card>

      {/* Pontuação por fase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Pontuação por fase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold">Fase de Grupos</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>🎯 Acertar <strong>placar exato</strong>: <Pts>{pontuacao.placar_exato}</Pts></li>
              <li>✅ Acertar <strong>vencedor ou empate</strong> (sem placar exato): <Pts>{pontuacao.vencedor_ou_empate}</Pts></li>
              <li>❌ Errar: 0 pontos</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Mata-mata <span className="text-xs font-normal text-muted-foreground">(pontos por cada seleção classificada acertada)</span></h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>16 avos de final: <Pts>{pontuacao.mata_16avos}</Pts> por acerto · até 16 acertos</li>
              <li>Oitavas: <Pts>{pontuacao.mata_8avos}</Pts> por acerto · até 8</li>
              <li>Quartas: <Pts>{pontuacao.mata_quartas}</Pts> por acerto · até 4</li>
              <li>Semifinal: <Pts>{pontuacao.mata_semi}</Pts> por acerto · até 2</li>
              <li>🥈 Vice-campeão: <Pts>{pontuacao.vice}</Pts></li>
              <li>🥇 Campeão: <Pts>{pontuacao.campeao}</Pts></li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 As 32 seleções que vão pro Round of 32 saem automaticamente dos resultados da fase de grupos (regulamento FIFA — pontos, saldo, gols pró, confronto direto, melhores 8 terceiros).
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Artilheiro</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>⚽ Acertar o artilheiro da Copa: <Pts>{pontuacao.artilheiro}</Pts></li>
              {rateio.artilheiro === 0 && (
                <li className="font-bold text-festive-orange">⚠️ Acertar o artilheiro <strong>NÃO dá prêmio em dinheiro</strong>, apenas pontos no ranking.</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Rateio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" /> Rateio dos prêmios
          </CardTitle>
          <CardDescription>Percentuais aplicados sobre o total arrecadado.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <RateioRow emoji="🥇" label="1º lugar" pct={rateio.primeiro} total={totalArrecadado} />
            <RateioRow emoji="🥈" label="2º lugar" pct={rateio.segundo} total={totalArrecadado} />
            <RateioRow emoji="🥉" label="3º lugar" pct={rateio.terceiro} total={totalArrecadado} />
            <RateioRow emoji="🐢" label="Lanterninha (menos pontos)" pct={rateio.lanterninha} total={totalArrecadado} />
            {rateio.artilheiro > 0 && (
              <RateioRow emoji="⚽" label="Acertou o artilheiro" pct={rateio.artilheiro} total={totalArrecadado} />
            )}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Em caso de empate em qualquer posição, o prêmio é dividido igualmente entre os empatados.
          </p>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" /> Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Valor da aposta: <strong>{formatCurrency(valorAposta)}</strong></p>
          <p>Chave PIX: <code className="rounded bg-muted px-2 py-0.5 text-xs">{pixChave}</code></p>
          <p>Recebedor: <strong>{pixNome}</strong></p>
          <p className="text-xs text-muted-foreground">
            Apenas participantes com pagamento confirmado aparecem no ranking público.{" "}
            <Link href="/pagamento" className="text-primary underline">Página de pagamento →</Link>
          </p>
        </CardContent>
      </Card>

      {/* Prazos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-400" /> Prazos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>📅 Palpites da fase de grupos encerram em: <strong className="text-foreground">{DEADLINE_FASE_GRUPOS.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" })}</strong></p>
          <p>🏟️ Mata-mata: palpitar até o início, mesmas regras de validação.</p>
          <p>🏆 Final: <strong>19/07/2026</strong> · MetLife Stadium (NY/NJ)</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Pts({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="default" className="ml-1">
      {children} pts
    </Badge>
  );
}

function RateioRow({ emoji, label, pct, total }: { emoji: string; label: string; pct: number; total: number }) {
  const valor = (total * pct) / 100;
  return (
    <li className="flex items-center justify-between">
      <span>{emoji} {label}: <strong>{pct}%</strong></span>
      <span className="font-mono text-primary">{formatCurrency(valor)}</span>
    </li>
  );
}

function gerarTextoCompartilhamento(o: {
  nomeBolao: string;
  pontuacao: PontuacaoConfig;
  rateio: RateioConfig;
  valorAposta: number;
  pixChave: string;
  pixNome: string;
  totalArrecadado: number;
}) {
  return `🏆 *${o.nomeBolao}* · Copa do Mundo FIFA 2026

💰 *Prêmio estimado*: ${formatCurrency(o.totalArrecadado)}
💵 *Valor da aposta*: ${formatCurrency(o.valorAposta)}

*Pontuação*:
🎯 Placar exato: ${o.pontuacao.placar_exato} pts
✅ Acertou vencedor/empate: ${o.pontuacao.vencedor_ou_empate} pts
⚽ Mata-mata: 8 / 12 / 16 / 20 pts por fase
🥇 Campeão: ${o.pontuacao.campeao} pts | 🥈 Vice: ${o.pontuacao.vice} pts
⚽ Artilheiro: ${o.pontuacao.artilheiro} pts

*Rateio*:
🥇 1º: ${o.rateio.primeiro}%  |  🥈 2º: ${o.rateio.segundo}%  |  🥉 3º: ${o.rateio.terceiro}%
🐢 Lanterninha: ${o.rateio.lanterninha}%${o.rateio.artilheiro > 0 ? `  |  ⚽ Artilheiro: ${o.rateio.artilheiro}%` : ""}

*Pagamento PIX*:
${o.pixChave}
(${o.pixNome})`;
}
