/**
 * Memória de cálculo de pontuação — quebra detalhada por usuário.
 *
 * Usado pelo /admin/usuarios na seção "Ver memória" pra auditoria
 * de pontuação. Reusa as funções de scoring + classificação.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FasePalpiteMata, PontuacaoConfig } from "@/types/database";
import {
  PONTUACAO_DEFAULT,
  avaliarPalpiteGrupo,
  pontosPalpiteGrupo,
  classificarPalpiteMata,
  pontosPalpiteMata,
} from "./scoring";
import { calcularFaseAlcancadaPorTime } from "./recalc";

export type BreakdownGrupoItem = {
  match_id: string;
  rodada: number;
  data_hora: string;
  casa_nome: string;
  casa_bandeira: string;
  fora_nome: string;
  fora_bandeira: string;
  palpite_casa: number | null;
  palpite_fora: number | null;
  real_casa: number | null;
  real_fora: number | null;
  status: "agendado" | "andamento" | "finalizado";
  pontos: number;
  tipo: "exato" | "vencedor" | "erro" | "pendente";
};

export type BreakdownMataItem = {
  fase: FasePalpiteMata;
  time_id: string;
  time_nome: string;
  time_bandeira: string;
  acertou: boolean;
  pontos: number;
  fase_real: string;
};

export type BreakdownArtilheiro = {
  nome_jogador: string;
  manual: boolean;
  acertou: boolean | null;
  pontos: number;
  ja_definido: boolean;
};

export type Breakdown = {
  user_id: string;
  nome: string;
  grupos: { items: BreakdownGrupoItem[]; subtotal: number };
  mata: { items: BreakdownMataItem[]; subtotal: number };
  artilheiro: BreakdownArtilheiro | null;
  total: number;
  posicao_atual: number | null;
};

const FASE_LABELS: Record<FasePalpiteMata, string> = {
  "16avos": "16 avos",
  "8avos": "Oitavas",
  "quartas": "Quartas",
  "semi": "Semi",
  "final": "Final",
  "campeao": "Campeão",
};

export async function calcularBreakdown(
  supabase: SupabaseClient,
  userId: string,
): Promise<Breakdown> {
  // Carrega config
  const { data: cfgRow } = await supabase
    .from("config")
    .select("valor")
    .eq("chave", "pontuacao")
    .single();
  const cfg: PontuacaoConfig = (cfgRow?.valor as PontuacaoConfig) ?? PONTUACAO_DEFAULT;

  // Dados básicos do user
  const { data: user } = await supabase
    .from("users")
    .select("nome")
    .eq("id", userId)
    .single();
  const nome = user?.nome ?? "—";

  // Posição atual (última snapshot)
  const { data: snap } = await supabase
    .from("ranking_snapshots")
    .select("posicao, pontos_totais")
    .eq("user_id", userId)
    .order("rodada_ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const posicaoAtual = snap?.posicao ?? null;

  // ─────────────── Fase de grupos ───────────────
  const [{ data: palpitesG }, { data: matchesG }, { data: teams }] = await Promise.all([
    supabase
      .from("palpites_grupos")
      .select("match_id, placar_casa, placar_fora")
      .eq("user_id", userId),
    supabase
      .from("matches")
      .select("id, rodada, data_hora, time_casa_id, time_fora_id, placar_casa, placar_fora, status")
      .eq("fase", "grupos")
      .order("data_hora"),
    supabase.from("teams").select("id, nome, bandeira_url"),
  ]);
  const teamMap = new Map((teams ?? []).map((t: any) => [t.id, t]));
  const palpitesGMap = new Map((palpitesG ?? []).map((p: any) => [p.match_id, p]));

  const gruposItems: BreakdownGrupoItem[] = [];
  let gruposSubtotal = 0;
  for (const m of (matchesG ?? []) as any[]) {
    const p = palpitesGMap.get(m.id) as any;
    const casa = teamMap.get(m.time_casa_id) as any;
    const fora = teamMap.get(m.time_fora_id) as any;
    let tipo: BreakdownGrupoItem["tipo"] = "pendente";
    let pontos = 0;
    if (m.status === "finalizado" && p) {
      const av = avaliarPalpiteGrupo(
        { casa: p.placar_casa, fora: p.placar_fora },
        { casa: m.placar_casa, fora: m.placar_fora },
      );
      tipo = av === "exato" ? "exato" : av === "vencedor_ou_empate" ? "vencedor" : "erro";
      pontos = pontosPalpiteGrupo(
        { casa: p.placar_casa, fora: p.placar_fora },
        { casa: m.placar_casa, fora: m.placar_fora },
        cfg,
      );
      gruposSubtotal += pontos;
    }
    gruposItems.push({
      match_id: m.id,
      rodada: m.rodada,
      data_hora: m.data_hora,
      casa_nome: casa?.nome ?? "—",
      casa_bandeira: casa?.bandeira_url ?? "",
      fora_nome: fora?.nome ?? "—",
      fora_bandeira: fora?.bandeira_url ?? "",
      palpite_casa: p?.placar_casa ?? null,
      palpite_fora: p?.placar_fora ?? null,
      real_casa: m.placar_casa ?? null,
      real_fora: m.placar_fora ?? null,
      status: m.status,
      pontos,
      tipo,
    });
  }

  // ─────────────── Mata-mata ───────────────
  const faseAlcancada = await calcularFaseAlcancadaPorTime(supabase as any);
  const { data: palpitesM } = await supabase
    .from("palpites_mata")
    .select("time_id, fase")
    .eq("user_id", userId);

  const ordemFase: Record<FasePalpiteMata, number> = {
    "16avos": 0,
    "8avos": 1,
    "quartas": 2,
    "semi": 3,
    "final": 4,
    "campeao": 5,
  };
  const mataItems: BreakdownMataItem[] = [];
  let mataSubtotal = 0;
  for (const p of (palpitesM ?? []) as any[]) {
    const time = teamMap.get(p.time_id) as any;
    const real = faseAlcancada.get(p.time_id) ?? "grupos";
    const cls = classificarPalpiteMata(p.fase as FasePalpiteMata, real as any);
    const pontos = cls.acertou && cls.faseEfetiva ? pontosPalpiteMata(cls.faseEfetiva, cfg) : 0;
    mataItems.push({
      fase: p.fase as FasePalpiteMata,
      time_id: p.time_id,
      time_nome: time?.nome ?? "—",
      time_bandeira: time?.bandeira_url ?? "",
      acertou: cls.acertou,
      pontos,
      fase_real:
        real === "grupos"
          ? "não classificou"
          : FASE_LABELS[real as FasePalpiteMata] ?? String(real),
    });
    mataSubtotal += pontos;
  }
  mataItems.sort((a, b) => {
    const fdiff = ordemFase[a.fase] - ordemFase[b.fase];
    if (fdiff !== 0) return fdiff;
    return a.time_nome.localeCompare(b.time_nome);
  });

  // ─────────────── Artilheiro ───────────────
  const { data: palpiteA } = await supabase
    .from("palpites_artilheiro")
    .select("player_id, player_nome_manual, acertou")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: jogadoresTop } = await supabase
    .from("players")
    .select("gols_torneio")
    .order("gols_torneio", { ascending: false })
    .limit(1);
  const jaDefinido = (jogadoresTop?.[0]?.gols_torneio ?? 0) > 0;

  let artilheiro: BreakdownArtilheiro | null = null;
  if (palpiteA) {
    const pa = palpiteA as any;
    let nomeJogador = "—";
    let manual = false;
    if (pa.player_id) {
      const { data: pl } = await supabase
        .from("players")
        .select("nome")
        .eq("id", pa.player_id)
        .single();
      nomeJogador = (pl as any)?.nome ?? "—";
    } else if (pa.player_nome_manual) {
      nomeJogador = pa.player_nome_manual;
      manual = true;
    }
    artilheiro = {
      nome_jogador: nomeJogador,
      manual,
      acertou: pa.acertou,
      pontos: pa.acertou ? cfg.artilheiro : 0,
      ja_definido: jaDefinido,
    };
  }

  const total = gruposSubtotal + mataSubtotal + (artilheiro?.pontos ?? 0);

  return {
    user_id: userId,
    nome,
    grupos: { items: gruposItems, subtotal: gruposSubtotal },
    mata: { items: mataItems, subtotal: mataSubtotal },
    artilheiro,
    total,
    posicao_atual: posicaoAtual,
  };
}

/**
 * Formata o breakdown como texto plain pra clipboard / WhatsApp.
 */
export function breakdownParaTexto(b: Breakdown): string {
  const lines: string[] = [];
  lines.push(`Memória de cálculo - ${b.nome}`);
  lines.push("═".repeat(40));
  lines.push("");

  lines.push(`FASE DE GRUPOS: ${b.grupos.subtotal} pts`);
  for (const it of b.grupos.items) {
    if (it.status !== "finalizado") continue;
    const palpite = `${it.palpite_casa ?? "-"}x${it.palpite_fora ?? "-"}`;
    const real = `${it.real_casa ?? "-"}x${it.real_fora ?? "-"}`;
    const tag = it.tipo === "exato" ? "+5 placar exato" : it.tipo === "vencedor" ? "+2 vencedor" : "0 errou";
    lines.push(`- R${it.rodada} ${it.casa_nome} ${real} ${it.fora_nome} (palpitou ${palpite}): ${tag}`);
  }
  lines.push("");

  lines.push(`MATA-MATA: ${b.mata.subtotal} pts`);
  for (const it of b.mata.items) {
    const ok = it.acertou ? "✅" : "❌";
    lines.push(`- ${FASE_LABELS[it.fase]}: ${it.time_nome} ${ok} ${it.pontos > 0 ? `+${it.pontos}` : "0"}`);
  }
  lines.push("");

  if (b.artilheiro) {
    lines.push(`ARTILHEIRO: ${b.artilheiro.pontos} pts`);
    const status = !b.artilheiro.ja_definido
      ? "⏳ aguardando"
      : b.artilheiro.acertou
        ? "✅ acertou"
        : "❌ errou";
    lines.push(`- Palpitou: ${b.artilheiro.nome_jogador} ${b.artilheiro.manual ? "(texto livre)" : ""} ${status}`);
    lines.push("");
  }

  lines.push(`TOTAL: ${b.total} pts | Posição: ${b.posicao_atual ?? "—"}º`);
  return lines.join("\n");
}
