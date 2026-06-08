/**
 * Mata-mata orientado a ROSTER por fase (admin manual).
 *
 * Cada fase é uma lista de seleções "que participam". O roster EFETIVO de
 * uma fase = base automática (só nos 16avos, vinda da classificação REAL
 * provisória dos grupos) combinada com os overrides manuais do admin
 * (tabela mata_roster_override). Overrides têm "cadeado": sobrevivem ao
 * recálculo automático.
 *
 * Este arquivo tem APENAS helpers puros + leitura (funções que recebem o
 * client). As mutações (toggle, recalcular auto) ficam em
 * `mata-roster-actions.ts` ("use server").
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FasePalpiteMata, Grupo } from "@/types/database";
import {
  classificadosProvisoriosR32,
  type ClassificadoProvisorio,
  type JogoFinalizado,
} from "./classification";

type SB = SupabaseClient;

/** Fases do mata, do mais raso ao mais profundo. */
export const FASES_MATA: FasePalpiteMata[] = [
  "16avos",
  "8avos",
  "quartas",
  "semi",
  "final",
  "campeao",
];

/** Quantidade-alvo de seleções por fase. */
export const ALVO_FASE: Record<FasePalpiteMata, number> = {
  "16avos": 32,
  "8avos": 16,
  "quartas": 8,
  "semi": 4,
  "final": 2,
  "campeao": 1,
};

export type RosterOverride = { fase: FasePalpiteMata; time_id: string; incluir: boolean };

// ─────────────────────────── Helpers PUROS (testáveis) ───────────────────

/**
 * Roster efetivo de uma fase = base + overrides.
 * base: conjunto inicial (16avos = R32 provisório; demais = vazio).
 * overrides: incluir=true adiciona, incluir=false remove.
 */
export function aplicarOverridesNaFase(
  base: Set<string>,
  overridesDaFase: { time_id: string; incluir: boolean }[],
): Set<string> {
  const out = new Set(base);
  for (const o of overridesDaFase) {
    if (o.incluir) out.add(o.time_id);
    else out.delete(o.time_id);
  }
  return out;
}

/**
 * Fase alcançada (REAL) por time, derivada dos rosters: a fase VERDE mais
 * profunda em que o time aparece. campeao > final(=vice) > semi > quartas >
 * 8avos > 16avos > grupos. Mesma assinatura de calcularFaseAlcancadaPorTime.
 */
export function faseAlcancadaDeRosters(
  rosters: Map<FasePalpiteMata, Set<string>>,
  todosTimeIds: string[],
): Map<string, FasePalpiteMata | "grupos"> {
  // Os 16 avos são a PORTA DE ENTRADA do mata: um time só conta como
  // classificado se estiver no roster dos 16 avos. Sem essa trava, sobras
  // de override em fases profundas (ex.: após "Recalcular automático"
  // esvaziar os 16 avos sem limpar as fases seguintes) gerariam
  // "classificados fantasma" pontuando indevidamente. No fluxo normal a
  // cascata na escrita mantém 8avos⊆16avos, então a trava não muda nada.
  const r16 = rosters.get("16avos");
  const out = new Map<string, FasePalpiteMata | "grupos">();
  for (const id of todosTimeIds) {
    let alcancada: FasePalpiteMata | "grupos" = "grupos";
    if (r16?.has(id)) {
      for (const fase of FASES_MATA) {
        if (rosters.get(fase)?.has(id)) alcancada = fase;
      }
    }
    out.set(id, alcancada);
  }
  return out;
}

/** Uma fase está "decidida" quando o roster atingiu (≥) o alvo dela. */
export function faseDecidida(
  rosters: Map<FasePalpiteMata, Set<string>>,
  fase: FasePalpiteMata,
): boolean {
  return (rosters.get(fase)?.size ?? 0) >= ALVO_FASE[fase];
}

/**
 * Estado de um palpite de mata (✅/❌/⏳), puro:
 *  - acertou: time alcançou ≥ a fase palpitada (via classificarPalpiteMata,
 *    avaliado fora — aqui recebemos `acertou` já calculado);
 *  - errou: não acertou E a fase palpitada já está decidida (roster cheio);
 *  - pendente: não acertou e a fase ainda não foi decidida.
 */
export function estadoPalpiteMata(
  acertou: boolean,
  faseDecididaDaFasePalpitada: boolean,
): "acertou" | "errou" | "pendente" {
  if (acertou) return "acertou";
  return faseDecididaDaFasePalpitada ? "errou" : "pendente";
}

// ─────────────────────────── Leitura (recebe client) ─────────────────────

/** Lê os resultados REAIS de grupos finalizados e devolve JogoFinalizado[]. */
async function lerJogosGruposReais(sb: SB): Promise<{ jogos: JogoFinalizado[]; finalizados: number }> {
  const { data } = await sb
    .from("matches")
    .select("grupo, time_casa_id, time_fora_id, placar_casa, placar_fora, status")
    .eq("fase", "grupos");
  const todos = (data ?? []) as any[];
  const jogos: JogoFinalizado[] = [];
  let finalizados = 0;
  for (const m of todos) {
    if (m.status !== "finalizado" || m.placar_casa === null || m.placar_fora === null) continue;
    if (!m.grupo || !m.time_casa_id || !m.time_fora_id) continue;
    finalizados++;
    jogos.push({
      grupo: m.grupo as Grupo,
      time_casa_id: m.time_casa_id,
      time_fora_id: m.time_fora_id,
      placar_casa: m.placar_casa,
      placar_fora: m.placar_fora,
    });
  }
  return { jogos, finalizados };
}

/** Mapa time_id → ranking_fifa (pro desempate dos 3ºs). */
async function lerRankingFifa(sb: SB): Promise<Map<string, number>> {
  const { data } = await sb.from("teams").select("id, ranking_fifa");
  const m = new Map<string, number>();
  for (const t of (data ?? []) as any[]) {
    if (t.ranking_fifa != null) m.set(t.id, t.ranking_fifa);
  }
  return m;
}

/**
 * R32 automático (provisório) a partir dos resultados REAIS de grupos.
 * NÃO depende do cron — lê a tabela matches direto. Vazio se nenhum jogo
 * de grupo finalizado ainda.
 */
export async function calcularR32Automatico(sb: SB): Promise<ClassificadoProvisorio[]> {
  const [{ jogos }, ranking] = await Promise.all([lerJogosGruposReais(sb), lerRankingFifa(sb)]);
  if (jogos.length === 0) return [];
  return classificadosProvisoriosR32(jogos, ranking);
}

/** Lê todos os overrides agrupados por fase. */
async function lerOverrides(sb: SB): Promise<Map<FasePalpiteMata, { time_id: string; incluir: boolean }[]>> {
  const { data } = await sb.from("mata_roster_override").select("fase, time_id, incluir");
  const out = new Map<FasePalpiteMata, { time_id: string; incluir: boolean }[]>();
  for (const o of (data ?? []) as any[]) {
    const arr = out.get(o.fase) ?? [];
    arr.push({ time_id: o.time_id, incluir: o.incluir });
    out.set(o.fase, arr);
  }
  return out;
}

export type RosterTodasFases = {
  rosters: Map<FasePalpiteMata, Set<string>>;
  cadeados: Map<FasePalpiteMata, Set<string>>;
  r32Auto: ClassificadoProvisorio[];
};

/**
 * Roster efetivo de TODAS as fases (usado pelo scoring). Faz uma leitura só
 * dos overrides + uma do R32 automático.
 */
export async function getRosterTodasFases(sb: SB): Promise<RosterTodasFases> {
  const [r32Auto, overrides] = await Promise.all([calcularR32Automatico(sb), lerOverrides(sb)]);
  const baseR32 = new Set(r32Auto.map((c) => c.time_id));
  const rosters = new Map<FasePalpiteMata, Set<string>>();
  const cadeados = new Map<FasePalpiteMata, Set<string>>();
  for (const fase of FASES_MATA) {
    const ovs = overrides.get(fase) ?? [];
    const base = fase === "16avos" ? baseR32 : new Set<string>();
    rosters.set(fase, aplicarOverridesNaFase(base, ovs));
    cadeados.set(fase, new Set(ovs.map((o) => o.time_id)));
  }
  return { rosters, cadeados, r32Auto };
}

/** Roster efetivo de UMA fase + cadeados. */
export async function getRosterEfetivo(
  sb: SB,
  fase: FasePalpiteMata,
): Promise<{ efetivo: Set<string>; cadeados: Set<string> }> {
  const { rosters, cadeados } = await getRosterTodasFases(sb);
  return { efetivo: rosters.get(fase) ?? new Set(), cadeados: cadeados.get(fase) ?? new Set() };
}

/**
 * Pool selecionável de uma fase: 16avos = todos os times; demais = efetivo
 * da fase anterior. `incluirTodos` força mostrar os 48 (escape pra corrigir
 * por baixo).
 */
export async function getPoolDaFase(
  sb: SB,
  fase: FasePalpiteMata,
  incluirTodos = false,
): Promise<Set<string>> {
  if (incluirTodos || fase === "16avos") {
    const { data } = await sb.from("teams").select("id");
    return new Set((data ?? []).map((t: any) => t.id));
  }
  const idx = FASES_MATA.indexOf(fase);
  const faseAnterior = FASES_MATA[idx - 1];
  const { efetivo } = await getRosterEfetivo(sb, faseAnterior);
  return efetivo;
}

export type TimeRosterUI = { id: string; nome: string; bandeira_url: string; grupo: string };

export type RosterUIPayload = {
  /** Todos os 48 times (uma vez). */
  times: TimeRosterUI[];
  /** ids efetivos (verdes) por fase. */
  porFase: Record<FasePalpiteMata, string[]>;
  /** ids com override manual (cadeado) por fase. */
  cadeados: Record<FasePalpiteMata, string[]>;
  /** time_id → origem ("1º Grupo A" / "Nº melhor 3º") — só 16avos. */
  origem: Record<string, string>;
  /** quantos jogos de grupo já finalizados (monitor provisório dos 16 avos). */
  gruposFinalizados: number;
  gruposTotal: number;
};

/**
 * Payload data-oriented pra UI do admin do roster (uma leitura só, sem N
 * consultas na tela).
 */
export async function montarRosterUI(sb: SB): Promise<RosterUIPayload> {
  const [teamsRes, todas, cntFin, cntTot] = await Promise.all([
    sb.from("teams").select("id, nome, bandeira_url, grupo").order("grupo").order("nome"),
    getRosterTodasFases(sb),
    sb.from("matches").select("id", { count: "exact", head: true }).eq("fase", "grupos").eq("status", "finalizado"),
    sb.from("matches").select("id", { count: "exact", head: true }).eq("fase", "grupos"),
  ]);

  const times = ((teamsRes.data ?? []) as any[]).map((t) => ({
    id: t.id,
    nome: t.nome,
    bandeira_url: t.bandeira_url ?? "",
    grupo: t.grupo ?? "",
  }));

  const porFase = {} as Record<FasePalpiteMata, string[]>;
  const cadeados = {} as Record<FasePalpiteMata, string[]>;
  for (const fase of FASES_MATA) {
    porFase[fase] = [...(todas.rosters.get(fase) ?? new Set())];
    cadeados[fase] = [...(todas.cadeados.get(fase) ?? new Set())];
  }

  const origem: Record<string, string> = {};
  for (const c of todas.r32Auto) origem[c.time_id] = c.origem;

  return {
    times,
    porFase,
    cadeados,
    origem,
    gruposFinalizados: cntFin.count ?? 0,
    gruposTotal: cntTot.count ?? 0,
  };
}
