import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { MataMataForm } from "./mata-mata-form";
import { Countdown } from "@/components/misc/countdown";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { resolverBracketR32, R32_PARES } from "@/lib/bracket-2026";
import { PONTUACAO_DEFAULT } from "@/lib/scoring";
import type { Grupo, PontuacaoConfig } from "@/types/database";
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
  const pontuacao: PontuacaoConfig = (cfgRow?.valor as PontuacaoConfig) ?? PONTUACAO_DEFAULT;

  const fechado = Date.now() >= DEADLINE_FASE_GRUPOS.getTime();

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

  // Mesmo com palpites parciais, computa o que dá pra resolver
  const r32Resolvido = todosPalpitados
    ? resolverBracketR32(jogosPalpitados)
    : palpitados > 0
      ? resolverBracketR32(jogosPalpitados) // parcial — alguns slots ficam null
      : R32_PARES.map((p) => ({
          ...p,
          casaTime: null,
          foraTime: null,
          casaOrigemTerceiro: null,
          foraOrigemTerceiro: null,
        }));

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
                {pontuacao.mata_16avos} · {pontuacao.mata_8avos} · {pontuacao.mata_quartas} · {pontuacao.mata_semi}
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
      />
    </div>
  );
}
