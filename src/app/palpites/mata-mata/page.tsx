import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { MataMataForm } from "./mata-mata-form";
import { Countdown } from "@/components/misc/countdown";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { resolverBracketR32, R32_PARES } from "@/lib/bracket-2026";
import { carregarRankingFifa } from "@/lib/mata-roster";
import { apostasFechadas } from "@/lib/apostas";
import { PONTUACAO_DEFAULT, normalizarPontuacao } from "@/lib/scoring";
import { calcularBreakdown } from "@/lib/scoring-breakdown";
import type { Grupo } from "@/types/database";
import type { JogoFinalizado } from "@/lib/classification";

export const dynamic = "force-dynamic";

type MatchInfo = {
  id: string;
  grupo: Grupo | null;
  time_casa_id: string | null;
  time_fora_id: string | null;
};

export default async function MataMataPage() {
  const user = await requireUser();
  const supabase = createClient();

  const [{ data: teams }, { data: palpitesMata }, { data: matchesGrupos }, { data: palpitesGrupos }, { data: cfgRow }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, nome, codigo_fifa, bandeira_url, grupo, tbd")
      .order("grupo")
      .order("nome"),
    supabase
      .from("palpites_mata")
      .select("time_id, fase")
      .eq("user_id", user.id),
    supabase
      .from("matches")
      .select("id, grupo, time_casa_id, time_fora_id")
      .eq("fase", "grupos"),
    supabase
      .from("palpites_grupos")
      .select("match_id, placar_casa, placar_fora")
      .eq("user_id", user.id),
    supabase.from("config").select("valor").eq("chave", "pontuacao").single(),
  ]);

  // Pontos por fase vêm da config (não hardcodar — admin pode mudar).
  // Normaliza pro padrão pts_* (fase alcançada).
  const pontuacao = normalizarPontuacao((cfgRow?.valor as any) ?? PONTUACAO_DEFAULT);

  // fechado no modelo B2 (override ? encerradas : prazo) — igual ao trigger.
  const fechado = await apostasFechadas(supabase as any);

  // Constrói os "jogos finalizados" a partir dos PALPITES do usuário,
  // não dos resultados reais. Cada palpite vira um JogoFinalizado virtual.
  const matchInfo = new Map<string, MatchInfo>();
  for (const m of (matchesGrupos ?? []) as any[]) {
    matchInfo.set(m.id, m);
  }

  const jogosPalpitados: JogoFinalizado[] = [];
  for (const p of (palpitesGrupos ?? []) as any[]) {
    const m = matchInfo.get(p.match_id);
    if (!m || !m.grupo || !m.time_casa_id || !m.time_fora_id) continue;
    jogosPalpitados.push({
      grupo: m.grupo,
      time_casa_id: m.time_casa_id,
      time_fora_id: m.time_fora_id,
      placar_casa: p.placar_casa,
      placar_fora: p.placar_fora,
    });
  }

  const totalGrupos = matchesGrupos?.length ?? 0;
  const palpitados = jogosPalpitados.length;
  const todosPalpitados = palpitados === totalGrupos && totalGrupos > 0;

  // Ranking FIFA: penúltimo critério de desempate. Sem ele, num grupo
  // empatado (ex.: tudo 0×0) a previsão do apostador desempataria por UUID
  // e NÃO bateria com a realidade (que usa ranking). (item 52 estendido)
  const rankingFifa = await carregarRankingFifa(supabase as any);

  // Mesmo com palpites parciais, computa o que dá pra resolver
  const r32Resolvido = todosPalpitados
    ? resolverBracketR32(jogosPalpitados, rankingFifa)
    : palpitados > 0
      ? resolverBracketR32(jogosPalpitados, rankingFifa) // parcial — alguns slots ficam null
      : R32_PARES.map((p) => ({
          ...p,
          casaTime: null,
          foraTime: null,
          casaOrigemTerceiro: null,
          foraOrigemTerceiro: null,
        }));

  // Item 46 — pontos por pick no bracket. Reusa o breakdown (mesma conta do
  // admin), evitando reinventar. Chave `${fase}:${time_id}` → label; e
  // `centro:${time_id}` = soma do caso da final (pts_final + campeão|vice).
  const pontosMata: Record<string, string> = {};
  try {
    const bd = await calcularBreakdown(supabase as any, user.id);
    for (const it of bd.mata.items) {
      pontosMata[`${it.fase}:${it.time_id}`] = it.pendente ? "⏳" : it.pontos > 0 ? `+${it.pontos}` : "0";
    }
    const campItem = bd.mata.items.find((i) => i.fase === "campeao");
    for (const fi of bd.mata.items.filter((i) => i.fase === "final")) {
      let total = fi.pontos;
      let pend = fi.pendente;
      if (campItem && campItem.time_id === fi.time_id) {
        total += campItem.pontos;
        pend = pend || campItem.pendente;
      }
      if (bd.vice && bd.vice.time_id === fi.time_id) {
        total += bd.vice.pontos;
        pend = pend || bd.vice.pendente;
      }
      pontosMata[`centro:${fi.time_id}`] = total > 0 ? `+${total}` : pend ? "⏳" : "0";
    }
  } catch {
    // se o breakdown falhar, o bracket cai no ✓ (pontosMata vazio)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
          <div>
            <CardTitle>🏆 Mata-mata · seu chaveamento</CardTitle>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              O R32 (16 avos) é montado dinamicamente pelos <strong className="text-foreground">seus palpites</strong> da fase de grupos. Marque quem você acha que ganha cada partida.
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              Pontos:{" "}
              <span className="text-festive-green">
                16 Avos {pontuacao.pts_r32} · Oitavas {pontuacao.pts_oitavas} · Quartas {pontuacao.pts_quartas} · Semi {pontuacao.pts_semi} · Final {pontuacao.pts_final}
              </span>{" "}
              · {pontuacao.vice} (vice) · {pontuacao.campeao} (campeão)
            </p>
          </div>
          <Countdown target={DEADLINE_FASE_GRUPOS} label="Encerra em" />
        </CardHeader>
      </Card>

      {/* Banner: falta preencher palpites da fase de grupos */}
      {!todosPalpitados && (
        <Card className="border-2 border-festive-orange/40 bg-festive-orange/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-festive-orange" />
            <div className="flex-1 text-sm">
              <p className="font-extrabold text-festive-orange">
                {palpitados === 0
                  ? "Você ainda não palpitou nada na fase de grupos!"
                  : `Faltam ${totalGrupos - palpitados} jogo(s) pra você palpitar na fase de grupos.`}
              </p>
              <p className="mt-1 text-muted-foreground">
                O R32 do seu bracket é calculado pelos <strong>seus palpites</strong> de placar (regras FIFA: pontos → saldo → gols pró → confronto direto, + 8 melhores 3ºs).
                Sem todos os palpites, o bracket fica incompleto.{" "}
                <Link href="/palpites/grupos" className="font-bold text-festive-green underline">
                  Bora chutar os 72 jogos →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <MataMataForm
        teams={(teams ?? []) as any}
        palpites={(palpitesMata ?? []) as any}
        r32={r32Resolvido}
        fechado={fechado}
        userId={user.id}
        pontosMata={pontosMata}
      />
    </div>
  );
}
