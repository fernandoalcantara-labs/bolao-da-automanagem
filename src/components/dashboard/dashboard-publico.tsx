import { createClient } from "@/lib/supabase/server";
import { KpiCards } from "./kpi-cards";
import { RankingTable } from "./ranking-table";
import { MultiLineChart } from "./multi-line-chart";
import { BarChartRodada } from "./bar-chart-rodada";
import { Heatmap } from "./heatmap";
import { PieCampeao, PieArtilheiro } from "./pies";
import { ConfrontosRodada } from "./confrontos-rodada";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export async function DashboardPublico() {
  const supabase = createClient();

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
    supabase.from("users").select("id, nome, pago").eq("pago", true),
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

  const usersPagos = users ?? [];
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

  // Líder atual (posicao 1 na última rodada)
  const lider = snapsUltima.find((s) => s.posicao === 1);
  const liderNome = lider ? usersById.get(lider.user_id)?.nome ?? "—" : "—";

  // Maior pontuador da última rodada
  const maiorPontuador = snapsUltima.length
    ? snapsUltima.reduce((max, s) => (s.pontos_rodada > max.pontos_rodada ? s : max), snapsUltima[0])
    : null;
  const maiorPontuadorNome = maiorPontuador ? usersById.get(maiorPontuador.user_id)?.nome ?? "—" : "—";

  // Taxa de acerto média da última rodada — proxy: média de pontos_rodada / max possível.
  // Como max varia por rodada, vamos só mostrar média de pontos.
  const mediaPontosUltima =
    snapsUltima.length > 0
      ? Math.round(
          (snapsUltima.reduce((acc, s) => acc + s.pontos_rodada, 0) / snapsUltima.length) * 10,
        ) / 10
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
          🏆 FIFA World Cup 2026 · {ultimaLabel}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {nomeBolao}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ranking ao vivo, gráficos da disputa entre os {usersPagos.length} participantes pagos · prêmio
          estimado de <strong className="text-primary">R$ {totalArrecadado.toLocaleString("pt-BR")}</strong>.
        </p>
      </header>

      <KpiCards
        totalPagos={usersPagos.length}
        totalArrecadado={totalArrecadado}
        jogosFinalizados={jogosFinalizados}
        totalJogos={totalJogos}
        liderNome={liderNome}
        liderPontos={lider?.pontos_totais ?? 0}
        maiorPontuadorNome={maiorPontuadorNome}
        maiorPontuadorPontos={maiorPontuador?.pontos_rodada ?? 0}
        ultimaLabel={ultimaLabel}
        mediaPontos={mediaPontosUltima}
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
        <Card>
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

        <Card>
          <CardHeader>
            <CardTitle>🔥 Heatmap · pontos por rodada</CardTitle>
            <CardDescription>Verde mais forte = mais pontos.</CardDescription>
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
