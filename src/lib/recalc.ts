/**
 * Engine de recálculo do Bolão.
 *
 * Responsabilidades:
 *  1) Calcular pontos_calculados de cada palpite_grupos a partir dos
 *     placares finalizados.
 *  2) Determinar "até onde foi" cada seleção no mata-mata e marcar
 *     palpites_mata como acertou/errou.
 *  3) Calcular acerto do palpite_artilheiro (jogador com mais gols).
 *  4) Gerar ranking_snapshots para cada rodada (1..8) com posição/pontos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PontuacaoConfig, FasePalpiteMata, Grupo } from "@/types/database";
import {
  PONTUACAO_DEFAULT,
  classificarPalpiteMata,
  pontosPalpiteGrupo,
  pontosPalpiteMata,
  normalizarPontuacao,
  timeVicePalpitado,
} from "./scoring";
import { resolverBracketR32 } from "./bracket-2026";
import { timesValidosR32 } from "./mata-mata-picks";
import { getRosterTodasFases, faseAlcancadaDeRosters, carregarRankingFifa } from "./mata-roster";
import type { JogoFinalizado } from "./classification";

// Cliente sem generic de schema — chamadas usam type assertions.
type SB = SupabaseClient;

/**
 * R32 (32 classificados) de CADA usuário, derivado dos palpites de grupos
 * dele — Map<user_id, Set<time_id>>. Usado pra ignorar, na pontuação,
 * picks de mata "fantasma": times que saíram do R32 do user depois de
 * marcados (ele trocou palpites de grupos). Sem isso, um pick órfão de
 * um time que avança na vida real renderia pontos indevidos.
 *
 * Se não dá pra resolver o R32 de um user (palpites de grupos vazios ou
 * incompletos a ponto de o resolver falhar), ele fica FORA do mapa →
 * `pickDeMataValido` devolve true (não penaliza na dúvida).
 */
async function calcularR32PorUsuario(supabase: SB): Promise<Map<string, Set<string>>> {
  const { data: matchesG } = await supabase
    .from("matches")
    .select("id, grupo, time_casa_id, time_fora_id")
    .eq("fase", "grupos");
  const minfo = new Map((matchesG ?? []).map((m: any) => [m.id, m]));

  const { data: palpitesG } = await supabase
    .from("palpites_grupos")
    .select("user_id, match_id, placar_casa, placar_fora");

  // Ranking FIFA pro desempate — o R32 do usuário tem que desempatar igual à
  // realidade (que usa ranking), senão num grupo empatado o user "erraria" o
  // R32 por causa do UUID. (item 52 estendido ao apostador)
  const ranking = await carregarRankingFifa(supabase);

  const porUser = new Map<string, JogoFinalizado[]>();
  for (const p of (palpitesG ?? []) as any[]) {
    const m = minfo.get(p.match_id) as any;
    if (!m || !m.grupo || !m.time_casa_id || !m.time_fora_id) continue;
    const arr = porUser.get(p.user_id) ?? [];
    arr.push({
      grupo: m.grupo as Grupo,
      time_casa_id: m.time_casa_id,
      time_fora_id: m.time_fora_id,
      placar_casa: p.placar_casa,
      placar_fora: p.placar_fora,
    });
    porUser.set(p.user_id, arr);
  }

  const out = new Map<string, Set<string>>();
  for (const [userId, jogos] of porUser) {
    try {
      const set = timesValidosR32(resolverBracketR32(jogos, ranking));
      if (set.size > 0) out.set(userId, set);
    } catch {
      // sem R32 confiável → não entra no mapa (não filtra esse user)
    }
  }
  return out;
}

/**
 * Um pick de mata pontua? Só se o time estiver no R32 do usuário. Se não
 * temos o R32 dele no mapa (incompleto/erro), devolve true (não penaliza).
 */
function pickDeMataValido(
  r32PorUser: Map<string, Set<string>>,
  userId: string,
  timeId: string,
): boolean {
  const set = r32PorUser.get(userId);
  if (!set) return true;
  return set.has(timeId);
}

export const ROUND_LABELS = [
  { ordem: 1, label: "Grupos R1", filtro: { fase: "grupos" as const, rodada: 1 } },
  { ordem: 2, label: "Grupos R2", filtro: { fase: "grupos" as const, rodada: 2 } },
  { ordem: 3, label: "Grupos R3", filtro: { fase: "grupos" as const, rodada: 3 } },
  { ordem: 4, label: "16 Avos", filtro: { fase: "16avos" as const } },
  { ordem: 5, label: "Oitavas", filtro: { fase: "8avos" as const } },
  { ordem: 6, label: "Quartas", filtro: { fase: "quartas" as const } },
  { ordem: 7, label: "Semi", filtro: { fase: "semi" as const } },
  { ordem: 8, label: "Final", filtro: { fase: "final" as const } },
  // ordem 9 = Artilheiro — coluna separada nos gráficos. Pontos só
  // entram quando o admin valida o artilheiro (gols_torneio > 0 e/ou
  // acertou=true via marcação manual).
  { ordem: 9, label: "Artilheiro", filtro: { fase: "artilheiro" as const } },
];

/**
 * Coluna (ordem em ROUND_LABELS) em que cada fase do palpite de mata é
 * creditada — ALINHADA à fase que a coluna NOMEIA (item 43/45). pick "8avos"
 * (chegou às oitavas) → col 5 (Oitavas), "final" → col 8 (Final). O campeão
 * e o vice caem na col 8 (Final); o pts_r32 é creditado à parte na col 4.
 * Exportado pra teste (tests/colunas-pontuacao.test.ts).
 */
export const faseParaOrdemMata: Record<FasePalpiteMata, number> = {
  "16avos": 4, // não há pick de 16avos; pts_r32 é creditado à parte (col 4)
  "8avos": 5, // chegou às oitavas → coluna Oitavas
  "quartas": 6,
  "semi": 7,
  "final": 8, // chegou à final → coluna Final
  "campeao": 8, // campeão + vice
};

/**
 * Resultado de um recálculo — usado pelo log do admin (QW3 item 17).
 * Captura o estado de pontos por usuário antes/depois do recálculo
 * pra mostrar o impacto da operação.
 */
export type RecalcLog = {
  duracao_ms: number;
  total_palpites_grupos: number;
  total_palpites_mata: number;
  total_palpites_artilheiro: number;
  jogos_finalizados: number;
  usuarios_alterados: Array<{
    user_id: string;
    nome: string;
    antes: number;
    depois: number;
    delta: number;
  }>;
};

export async function recalcularTudo(
  supabase: SB,
): Promise<{ ok: true; log: RecalcLog }> {
  const t0 = Date.now();

  // Captura pontos totais por usuário ANTES (último ranking_snapshot)
  const pontosAntes = await capturarPontosTotais(supabase);

  // Recalc
  const cfg = await carregarPontuacao(supabase);
  await recalcularPalpitesGrupos(supabase, cfg);
  const faseAlcancada = await calcularFaseAlcancadaPorTime(supabase);
  // R32 por usuário (dos palpites de grupos) — pra ignorar picks fantasma
  // na pontuação do mata-mata.
  const r32PorUser = await calcularR32PorUsuario(supabase);
  await recalcularPalpitesMata(supabase, cfg, faseAlcancada, r32PorUser);
  await recalcularPalpiteArtilheiro(supabase);
  await gerarSnapshots(supabase, cfg, faseAlcancada, r32PorUser);

  // Captura pontos totais DEPOIS + diff
  const pontosDepois = await capturarPontosTotais(supabase);

  const { data: users } = await supabase
    .from("users")
    .select("id, nome, nome_exibicao");

  const usuariosAlterados: RecalcLog["usuarios_alterados"] = [];
  for (const u of (users ?? []) as any[]) {
    const antes = pontosAntes.get(u.id) ?? 0;
    const depois = pontosDepois.get(u.id) ?? 0;
    const delta = depois - antes;
    if (delta !== 0) {
      usuariosAlterados.push({
        user_id: u.id,
        nome: (u.nome_exibicao as string) ?? u.nome,
        antes,
        depois,
        delta,
      });
    }
  }
  // Ordena por |delta| decrescente — quem teve maior impacto primeiro
  usuariosAlterados.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const [pg, pm, pa, jf] = await Promise.all([
    supabase.from("palpites_grupos").select("id", { count: "exact", head: true }),
    supabase.from("palpites_mata").select("id", { count: "exact", head: true }),
    supabase.from("palpites_artilheiro").select("id", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "finalizado"),
  ]);

  return {
    ok: true,
    log: {
      duracao_ms: Date.now() - t0,
      total_palpites_grupos: pg.count ?? 0,
      total_palpites_mata: pm.count ?? 0,
      total_palpites_artilheiro: pa.count ?? 0,
      jogos_finalizados: jf.count ?? 0,
      usuarios_alterados: usuariosAlterados,
    },
  };
}

/**
 * Pega pontos_totais da última rodada presente em ranking_snapshots.
 * Map<user_id, pontos>. Se não houver snapshots ainda, retorna mapa vazio
 * (a primeira chamada de recalc após reset terá tudo como "delta novo").
 */
async function capturarPontosTotais(supabase: SB): Promise<Map<string, number>> {
  const { data: snaps } = await supabase
    .from("ranking_snapshots")
    .select("user_id, rodada_ordem, pontos_totais");
  if (!snaps || snaps.length === 0) return new Map();
  // Pra cada user, pega o pontos_totais da MAIOR rodada_ordem
  const maxOrdemPorUser = new Map<string, number>();
  for (const s of snaps as any[]) {
    const cur = maxOrdemPorUser.get(s.user_id) ?? -1;
    if (s.rodada_ordem > cur) maxOrdemPorUser.set(s.user_id, s.rodada_ordem);
  }
  const out = new Map<string, number>();
  for (const s of snaps as any[]) {
    if (s.rodada_ordem === maxOrdemPorUser.get(s.user_id)) {
      out.set(s.user_id, s.pontos_totais);
    }
  }
  return out;
}

async function carregarPontuacao(supabase: SB): Promise<PontuacaoConfig> {
  const { data } = await supabase.from("config").select("valor").eq("chave", "pontuacao").single();
  // Normaliza pro padrão pts_* (garante a faixa R32 e os campos novos).
  return normalizarPontuacao((data?.valor as any) ?? PONTUACAO_DEFAULT);
}

async function recalcularPalpitesGrupos(supabase: SB, cfg: PontuacaoConfig) {
  // IMPORTANTE: lê TODOS os jogos de grupos (não só finalizados). Se um jogo
  // que estava finalizado voltou pra "agendado" (ex: admin reverteu edição
  // manual), os palpites dele precisam zerar — senão pontos antigos ficam
  // congelados no banco.
  const { data: matches } = await supabase
    .from("matches")
    .select("id, placar_casa, placar_fora, status")
    .eq("fase", "grupos");
  if (!matches) return;

  const { data: palpites } = await supabase
    .from("palpites_grupos")
    .select("id, match_id, placar_casa, placar_fora");
  if (!palpites) return;

  const matchMap = new Map(matches.map((m: any) => [m.id, m]));

  // Agrupa ids por valor de pontos. Não-finalizados → 0 pts (zera no DB).
  const byPoints = new Map<number, string[]>();
  for (const p of palpites as any[]) {
    const m = matchMap.get(p.match_id) as any;
    let pts = 0;
    if (
      m &&
      m.status === "finalizado" &&
      m.placar_casa !== null &&
      m.placar_fora !== null
    ) {
      pts = pontosPalpiteGrupo(
        { casa: p.placar_casa, fora: p.placar_fora },
        { casa: m.placar_casa, fora: m.placar_fora },
        cfg,
      );
    }
    const arr = byPoints.get(pts) ?? [];
    arr.push(p.id);
    byPoints.set(pts, arr);
  }
  for (const [pts, ids] of byPoints) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await supabase
        .from("palpites_grupos")
        .update({ pontos_calculados: pts })
        .in("id", chunk);
      if (error) throw error;
    }
  }
}

/**
 * Determina a fase mais profunda alcançada por cada time — agora derivada
 * dos ROSTERS efetivos do mata (base R32 provisória dos grupos REAIS +
 * overrides manuais do admin), não mais dos confrontos da tabela `matches`.
 * A fase verde mais profunda do time vence: campeao > final(=vice) > semi >
 * quartas > 8avos > 16avos > grupos. Mesma assinatura/retorno de antes.
 */
export async function calcularFaseAlcancadaPorTime(
  supabase: SB,
): Promise<Map<string, FasePalpiteMata | "grupos">> {
  const { rosters } = await getRosterTodasFases(supabase);
  const { data: teams } = await supabase.from("teams").select("id");
  const todos = (teams ?? []).map((t: any) => t.id as string);
  return faseAlcancadaDeRosters(rosters, todos);
}

async function recalcularPalpitesMata(
  supabase: SB,
  cfg: PontuacaoConfig,
  faseAlcancada: Map<string, FasePalpiteMata | "grupos">,
  r32PorUser: Map<string, Set<string>>,
) {
  const { data: palpites } = await supabase
    .from("palpites_mata")
    .select("id, user_id, time_id, fase");
  if (!palpites) return;

  // Agrupa por valor de acertou (true/false) e atualiza em massa
  const acertaram: string[] = [];
  const erraram: string[] = [];
  for (const p of palpites) {
    // Pick fantasma (time fora do R32 do user) NUNCA acerta.
    if (!pickDeMataValido(r32PorUser, (p as any).user_id, p.time_id)) {
      erraram.push(p.id);
      continue;
    }
    const real = faseAlcancada.get(p.time_id) ?? "grupos";
    const r = classificarPalpiteMata(p.fase as FasePalpiteMata, real);
    if (r.acertou) acertaram.push(p.id);
    else erraram.push(p.id);
  }
  for (const [valor, ids] of [[true, acertaram] as const, [false, erraram] as const]) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await supabase
        .from("palpites_mata")
        .update({ acertou: valor })
        .in("id", chunk);
      if (error) throw error;
    }
  }
}

async function recalcularPalpiteArtilheiro(supabase: SB) {
  const { data: jogadores } = await supabase
    .from("players")
    .select("id, gols_torneio")
    .order("gols_torneio", { ascending: false });

  // Determina quem é(são) o(s) artilheiro(s) atual(is)
  const top = jogadores?.[0]?.gols_torneio ?? 0;
  const idsArtilheiros = top > 0
    ? new Set((jogadores ?? []).filter((p) => p.gols_torneio === top).map((p) => p.id))
    : new Set<string>();

  const { data: palpites } = await supabase
    .from("palpites_artilheiro")
    .select("id, player_id, player_nome_manual");
  if (!palpites) return;

  // Importante: só recalculamos automaticamente palpites com player_id (escolha
  // da lista). Palpites texto livre (player_nome_manual) ficam sob controle
  // exclusivo do admin via /admin/artilheiros — não tocamos no acertou deles
  // pra não desfazer validações manuais.
  const acertou: string[] = [];
  const errou: string[] = [];
  for (const p of palpites as Array<{ id: string; player_id: string | null; player_nome_manual: string | null }>) {
    if (p.player_id === null) continue; // pula texto livre — admin controla
    if (idsArtilheiros.has(p.player_id)) acertou.push(p.id);
    else errou.push(p.id);
  }
  for (const [v, ids] of [[true, acertou] as const, [false, errou] as const]) {
    if (ids.length === 0) continue;
    const { error } = await supabase.from("palpites_artilheiro").update({ acertou: v }).in("id", ids);
    if (error) throw error;
  }
}

/**
 * Calcula pontos do mata-mata por usuário, agrupados pela fase do palpite.
 * Os pontos são creditados na rodada em que a fase do palpite é jogada
 * (não na fase real do time) — assim o gráfico mostra cada conquista
 * no momento certo.
 */
function pontosMataPorUsuario(
  palpites: { user_id: string; time_id: string; fase: FasePalpiteMata }[],
  faseAlcancada: Map<string, FasePalpiteMata | "grupos">,
  cfg: PontuacaoConfig,
  r32PorUser: Map<string, Set<string>>,
): Map<string, Map<FasePalpiteMata, number>> {
  const out = new Map<string, Map<FasePalpiteMata, number>>();
  for (const p of palpites) {
    // Ignora picks fantasma (time fora do R32 do usuário) — não pontuam.
    if (!pickDeMataValido(r32PorUser, p.user_id, p.time_id)) continue;
    const real = faseAlcancada.get(p.time_id) ?? "grupos";
    const cls = classificarPalpiteMata(p.fase, real);
    if (!cls.acertou || !cls.faseEfetiva) continue;
    const pts = pontosPalpiteMata(cls.faseEfetiva, cfg);
    let u = out.get(p.user_id);
    if (!u) {
      u = new Map();
      out.set(p.user_id, u);
    }
    // Crédito na fase do palpite (rodada em que o palpite foi validado).
    u.set(p.fase, (u.get(p.fase) ?? 0) + pts);
  }
  return out;
}

/**
 * Gera ranking_snapshots — uma linha por (user_id, rodada_ordem).
 * pontos_rodada = pontos ganhos NAQUELA rodada
 * pontos_totais = soma acumulada até a rodada
 * posicao = ranking da rodada (1 = primeiro)
 */
async function gerarSnapshots(
  supabase: SB,
  cfg: PontuacaoConfig,
  faseAlcancada: Map<string, FasePalpiteMata | "grupos">,
  r32PorUser: Map<string, Set<string>>,
) {
  // 1) Apaga snapshots antigas
  await supabase.from("ranking_snapshots").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

  // 2) Para cada rodada 1..3 (grupos): soma pontos_calculados dos palpites cujos jogos estão na rodada
  const { data: users } = await supabase.from("users").select("id, pago");
  if (!users) return;

  // Estrutura: rodadaOrdem -> userId -> pontos_rodada
  const pontosPorRodada = new Map<number, Map<string, number>>();
  for (let r = 1; r <= 9; r++) pontosPorRodada.set(r, new Map());

  // Rodadas de grupos (1..3)
  for (const r of [1, 2, 3]) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .eq("fase", "grupos")
      .eq("rodada", r);
    const matchIds = (matches ?? []).map((m) => m.id);
    if (matchIds.length === 0) continue;
    const { data: palpites } = await supabase
      .from("palpites_grupos")
      .select("user_id, pontos_calculados")
      .in("match_id", matchIds);
    const mapa = pontosPorRodada.get(r)!;
    for (const p of palpites ?? []) {
      mapa.set(p.user_id, (mapa.get(p.user_id) ?? 0) + (p.pontos_calculados ?? 0));
    }
  }

  // Mata-mata: 4=16avos, 5=8avos, 6=quartas, 7=semi, 8=final
  const { data: palpitesMata } = await supabase
    .from("palpites_mata")
    .select("user_id, time_id, fase");
  const ptsMata = pontosMataPorUsuario(
    (palpitesMata ?? []).map((p) => ({
      user_id: p.user_id,
      time_id: p.time_id,
      fase: p.fase as FasePalpiteMata,
    })),
    faseAlcancada,
    cfg,
    r32PorUser,
  );
  // (43-45) Cada coluna contém a fase que ela NOMEIA (alinha com a memória
  // de cálculo do admin): pick "8avos" (chegou às oitavas) → coluna Oitavas
  // (5), "quartas" → Quartas (6), "semi" → Semi (7), "final" → Final (8).
  // O pts_r32 cai na col 4 (16 Avos) e o campeão/vice na col 8 (Final),
  // creditados nos blocos abaixo. Total acumulado inalterado — muda só a
  // coluna onde cada ponto aparece.
  for (const [userId, fasesMap] of ptsMata) {
    for (const [fase, pts] of fasesMap) {
      const ord = faseParaOrdemMata[fase];
      const mapa = pontosPorRodada.get(ord)!;
      mapa.set(userId, (mapa.get(userId) ?? 0) + pts);
    }
  }

  // (3B) Crédito do 16 Avos (pts_r32): cada time do R32 do usuário (dos
  // palpites de grupos dele) que REALMENTE classificou (faseAlcancada !==
  // "grupos") rende pts_r32. Creditado na rodada 4 ("16 avos").
  if (cfg.pts_r32 > 0) {
    const mapaR32 = pontosPorRodada.get(4)!;
    for (const [userId, set] of r32PorUser) {
      let pts = 0;
      for (const teamId of set) {
        if ((faseAlcancada.get(teamId) ?? "grupos") !== "grupos") pts += cfg.pts_r32;
      }
      if (pts > 0) mapaR32.set(userId, (mapaR32.get(userId) ?? 0) + pts);
    }
  }

  // (3D) Vice ADITIVO: o 2º finalista do usuário (finalista que ele NÃO
  // coroou), se for o vice REAL. Só conta quando há campeão REAL decidido.
  // Creditado no bucket do campeão (rodada 8, "Final").
  const campeaoDecidido = [...faseAlcancada.values()].some((f) => f === "campeao");
  if (campeaoDecidido) {
    const finalPorUser = new Map<string, string[]>();
    const campeaoPorUser = new Map<string, string>();
    for (const p of palpitesMata ?? []) {
      if (p.fase === "final") {
        const a = finalPorUser.get(p.user_id) ?? [];
        a.push(p.time_id);
        finalPorUser.set(p.user_id, a);
      } else if (p.fase === "campeao") {
        campeaoPorUser.set(p.user_id, p.time_id);
      }
    }
    const mapaVice = pontosPorRodada.get(8)!;
    for (const [userId, finals] of finalPorUser) {
      const vice = timeVicePalpitado(finals, campeaoPorUser.get(userId) ?? null);
      if (!vice) continue;
      if (!pickDeMataValido(r32PorUser, userId, vice)) continue;
      if ((faseAlcancada.get(vice) ?? "grupos") === "final") {
        mapaVice.set(userId, (mapaVice.get(userId) ?? 0) + cfg.vice);
      }
    }
  }

  // Artilheiro: coluna 9 (separada da Final pra ficar visível como coluna
  // própria nos gráficos). Só quem acertou ganha cfg.artilheiro pts;
  // os outros têm 0 pontos_rodada nessa coluna (e ranking se ajusta).
  const { data: palpitesArt } = await supabase
    .from("palpites_artilheiro")
    .select("user_id, acertou");
  for (const p of palpitesArt ?? []) {
    if (p.acertou) {
      const mapa = pontosPorRodada.get(9)!;
      mapa.set(p.user_id, (mapa.get(p.user_id) ?? 0) + cfg.artilheiro);
    }
  }

  // Acumulado e posição por rodada
  const acumulado = new Map<string, number>();
  const snapshots: {
    user_id: string;
    rodada_label: string;
    rodada_ordem: number;
    posicao: number;
    pontos_totais: number;
    pontos_rodada: number;
  }[] = [];

  for (const round of ROUND_LABELS) {
    const mapa = pontosPorRodada.get(round.ordem)!;
    // Atualiza acumulado
    for (const u of users) {
      const pts = mapa.get(u.id) ?? 0;
      acumulado.set(u.id, (acumulado.get(u.id) ?? 0) + pts);
    }
    // Cria array para ordenar e gerar posições
    const arr = users.map((u) => ({
      user_id: u.id,
      pontos_totais: acumulado.get(u.id) ?? 0,
      pontos_rodada: mapa.get(u.id) ?? 0,
    }));
    arr.sort((a, b) => b.pontos_totais - a.pontos_totais);
    arr.forEach((row, idx) => {
      snapshots.push({
        user_id: row.user_id,
        rodada_label: round.label,
        rodada_ordem: round.ordem,
        posicao: idx + 1,
        pontos_totais: row.pontos_totais,
        pontos_rodada: row.pontos_rodada,
      });
    });
  }

  if (snapshots.length > 0) {
    const { error } = await supabase.from("ranking_snapshots").insert(snapshots as any);
    if (error) throw error;
  }
}
