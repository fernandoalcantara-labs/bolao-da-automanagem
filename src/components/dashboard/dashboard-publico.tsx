import { createClient } from "@/lib/supabase/server";
import { KpiCards } from "./kpi-cards";
import { RankingTable } from "./ranking-table";
import { MultiLineChart } from "./multi-line-chart";
import { BarChartRodada } from "./bar-chart-rodada";
import { Heatmap } from "./heatmap";
import { PieCampeao, PieArtilheiro } from "./pies";
import { ConfrontosRodada } from "./confrontos-rodada";
import { PremiosCard } from "./premios-card";
import { BolaoNaoIniciouCard } from "./bolao-nao-iniciou";
import { formatarDataJogo } from "@/lib/datetime";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RATEIO_DEFAULT } from "@/lib/prizes";
import type { RateioConfig } from "@/types/database";
import { getCurrentUser } from "@/lib/auth-helpers";
import { BannersPendencia } from "@/components/banners/pendencias";
import { contarPalpitesUsuario } from "@/lib/palpites-stats";

export async function DashboardPublico() {
  const supabase = createClient();
  const currentUser = await getCurrentUser();
  const currentUserId = currentUser?.id ?? null;
  const stats = currentUserId
    ? await contarPalpitesUsuario(supabase as any, currentUserId)
    : null;

  const [
    { data: users },
    { data: snapshots },
    { data: matches },
    { data: teams },
    { data: palpitesCampeao },
    { data: palpitesArtilheiro },
    { data: players },
    { data: config },
  ] = await Promise.all([
    supabase.from("users").select("id, nome, nome_exibicao, pago").eq("pago", true),
    supabase
      .from("ranking_snapshots")
      .select("user_id, rodada_label, rodada_ordem, posicao, pontos_totais, pontos_rodada")
      .order("rodada_ordem", { ascending: true }),
    supabase
      .from("matches")
      .select("id, fase, rodada, time_casa_id, time_fora_id, data_hora, status, placar_casa, placar_fora")
      .order("data_hora", { ascending: true }),
    supabase.from("teams").select("id, nome, bandeira_url"),
    supabase.from("palpites_mata").select("user_id, time_id").eq("fase", "campeao"),
    supabase.from("palpites_artilheiro").select("user_id, player_id"),
    supabase.from("players").select("id, nome"),
    supabase.from("config").select("chave, valor"),
  ]);

  const conf = Object.fromEntries((config ?? []).map((c) => [c.chave, c.valor]));
  const valorAposta = Number(conf.valor_aposta ?? 50);
  const nomeBolao = String(conf.nome_bolao ?? "Bolão da AutoManagem");
  const rateio = (conf.rateio as RateioConfig) ?? RATEIO_DEFAULT;

  // Mapeia pra usar nome_exibicao (público) em vez de nome (privado)
  const usersPagos = (users ?? []).map((u: any) => ({
    ...u,
    nome: u.nome_exibicao ?? u.nome,
  }));
  const usersById = new Map(usersPagos.map((u) => [u.id, u]));
  const totalArrecadado = usersPagos.length * valorAposta;
  const totalJogos = matches?.length ?? 0;
  const jogosFinalizados = (matches ?? []).filter((m) => m.status === "finalizado").length;

  // Filtra snapshots pra incluir somente usuários pagos
  const snapsPagas = (snapshots ?? []).filter((s) => usersById.has(s.user_id));

  // Última rodada com dados
  const ultimaOrdem = snapsPagas.length
    ? Math.max(...snapsPagas.map((s) => s.rodada_ordem))
    : 0;
  const ultimaLabel = snapsPagas.find((s) => s.rodada_ordem === ultimaOrdem)?.rodada_label ?? "—";
  const snapsUltima = snapsPagas.filter((s) => s.rodada_ordem === ultimaOrdem);

  // Pódio dos KPIs: 1º, 2º, 3º (cada um com empates) + lanterninha
  function posicaoAgrupada(idx: number): { nomes: string[]; pontos: number } | null {
    const ordenado = [...snapsUltima].sort((a, b) => b.pontos_totais - a.pontos_totais);
    const grupos: number[] = [];
    for (const r of ordenado) {
      if (grupos.length === 0 || grupos[grupos.length - 1] !== r.pontos_totais) {
        grupos.push(r.pontos_totais);
      }
      if (grupos.length === idx + 1) break;
    }
    if (grupos.length <= idx) return null;
    const ptsAlvo = grupos[idx];
    const empatados = ordenado.filter((r) => r.pontos_totais === ptsAlvo);
    return {
      nomes: empatados.map((s) => usersById.get(s.user_id)?.nome ?? "—"),
      pontos: ptsAlvo,
    };
  }

  const primeiro = posicaoAgrupada(0);
  const segundo = posicaoAgrupada(1);
  const terceiro = posicaoAgrupada(2);

  // "Bolão começou" = pelo menos 1 jogo finalizado E alguém com pontos > 0.
  // Sem isso, todos empatados em 0 viram "todos em 1º com 0 pts" no KPI —
  // confuso e visualmente quebrado. Empty state amigável é melhor.
  const bolaoIniciou = jogosFinalizados > 0 && (primeiro?.pontos ?? 0) > 0;

  // Próximo jogo agendado (pra mostrar no empty state)
  const proximoJogo = (matches ?? [])
    .filter((m) => m.status === "agendado")
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))[0];
  const proximoJogoData = proximoJogo
    ? formatarDataJogo(proximoJogo.data_hora, "completo")
    : null;

  // Lanterninha = quem tem MENOS pontos (sem ser top 3)
  let lanterninha: { nomes: string[]; pontos: number } | null = null;
  if (snapsUltima.length > 0) {
    const top3Pts = new Set(
      [primeiro, segundo, terceiro].filter(Boolean).map((p) => p!.pontos),
    );
    const candidatos = snapsUltima.filter((s) => !top3Pts.has(s.pontos_totais));
    if (candidatos.length > 0) {
      const ptsMin = Math.min(...candidatos.map((s) => s.pontos_totais));
      const empatados = candidatos.filter((s) => s.pontos_totais === ptsMin);
      lanterninha = {
        nomes: empatados.map((s) => usersById.get(s.user_id)?.nome ?? "—"),
        pontos: ptsMin,
      };
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-festive-green/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-festive-green">
          🇧🇷 FIFA World Cup 2026 · {ultimaLabel}
        </p>
        <h1 className="font-fredoka text-3xl font-extrabold tracking-tight sm:text-4xl">
          {nomeBolao}
        </h1>
        <p className="max-w-2xl text-sm font-medium text-muted-foreground">
          🏆 Ranking ao vivo entre <strong className="text-foreground">{usersPagos.length} participantes pagos</strong> · prêmio
          estimado de <strong className="text-festive-green">R$ {totalArrecadado.toLocaleString("pt-BR")}</strong>
        </p>
      </header>

      {currentUser && stats && (
        <BannersPendencia
          palpitesFeitos={stats.feitos}
          palpitesEsperados={stats.esperados}
          pago={currentUser.pago}
        />
      )}

      <PremiosCard
        ranking={snapsUltima.map((s) => ({
          user_id: s.user_id,
          nome: usersById.get(s.user_id)?.nome ?? "—",
          pontos: s.pontos_totais,
        }))}
        acertaramArtilheiro={(palpitesArtilheiro ?? [])
          .filter((p) => usersById.has(p.user_id))
          .map((p) => p.user_id)
          .filter((id, i, arr) => arr.indexOf(id) === i)}
        rateio={rateio}
        totalArrecadado={totalArrecadado}
        bolaoIniciou={bolaoIniciou}
      />

      {bolaoIniciou ? (
        <>
          <KpiCards
            primeiro={primeiro}
            segundo={segundo}
            terceiro={terceiro}
            lanterninha={lanterninha}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>📈 Posições ao longo das rodadas</CardTitle>
                <CardDescription>Cada linha é um participante. Eixo Y invertido — quem está em cima está em 1º.</CardDescription>
              </CardHeader>
              <CardContent>
                <MultiLineChart
                  users={usersPagos.map((u) => ({ id: u.id, nome: u.nome }))}
                  snapshots={snapsPagas.map((s) => ({
                    user_id: s.user_id,
                    rodada_label: s.rodada_label,
                    rodada_ordem: s.rodada_ordem,
                    posicao: s.posicao,
                    pontos_rodada: s.pontos_rodada,
                    pontos_totais: s.pontos_totais,
                  }))}
                  currentUserId={currentUserId}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🏅 Ranking atual</CardTitle>
                <CardDescription>Apenas participantes pagos.</CardDescription>
              </CardHeader>
              <CardContent>
                <RankingTable
                  users={usersPagos.map((u) => ({ id: u.id, nome: u.nome }))}
                  snapshots={snapsPagas.map((s) => ({
                    user_id: s.user_id,
                    rodada_label: s.rodada_label,
                    rodada_ordem: s.rodada_ordem,
                    posicao: s.posicao,
                    pontos_rodada: s.pontos_rodada,
                    pontos_totais: s.pontos_totais,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>📊 Pontos na última rodada · {ultimaLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartRodada
                  data={snapsUltima
                    .map((s) => ({
                      nome: usersById.get(s.user_id)?.nome ?? "—",
                      pontos: s.pontos_rodada,
                    }))
                    .sort((a, b) => b.pontos - a.pontos)
                    .slice(0, 15)}
                />
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle>🔥 Heatmap · pontos por rodada</CardTitle>
                <CardDescription>Verde mais forte = mais pontos · arraste pro lado pra ver tudo.</CardDescription>
              </CardHeader>
              <CardContent>
                <Heatmap
                  users={usersPagos.map((u) => ({ id: u.id, nome: u.nome }))}
                  snapshots={snapsPagas.map((s) => ({
                    user_id: s.user_id,
                    rodada_label: s.rodada_label,
                    rodada_ordem: s.rodada_ordem,
                    pontos_rodada: s.pontos_rodada,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <BolaoNaoIniciouCard
          participantes={usersPagos.length}
          proximoJogoData={proximoJogoData}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>🏆 Palpites de campeão</CardTitle>
            <CardDescription>Distribuição entre os participantes pagos.</CardDescription>
          </CardHeader>
          <CardContent>
            <PieCampeao
              palpites={(palpitesCampeao ?? [])
                .filter((p) => usersById.has(p.user_id))
                .map((p) => p.time_id)}
              teams={Object.fromEntries((teams ?? []).map((t) => [t.id, t.nome]))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>⚽ Palpites de artilheiro</CardTitle>
            <CardDescription>Quem o pessoal acha que vai ser o goleador.</CardDescription>
          </CardHeader>
          <CardContent>
            <PieArtilheiro
              palpites={(palpitesArtilheiro ?? [])
                .filter((p) => usersById.has(p.user_id))
                .map((p) => p.player_id)}
              players={Object.fromEntries((players ?? []).map((p) => [p.id, p.nome]))}
            />
          </CardContent>
        </Card>
      </div>

      <ConfrontosRodada
        matches={(matches ?? []).slice(0, 12) as any}
        teams={Object.fromEntries(
          (teams ?? []).map((t) => [t.id, { nome: t.nome, bandeira_url: t.bandeira_url }]),
        )}
      />
    </div>
  );
}
