/**
 * Geração do CSV completo do bolão — formato largo (uma linha por jogo,
 * uma coluna por usuário). Lê tudo de uma vez pra evitar N+1.
 *
 * Saída tem 4 seções separadas por linhas em branco:
 *   1. FASE DE GRUPOS — 72 jogos × N usuários
 *   2. MATA-MATA — 31 picks × N usuários
 *   3. ARTILHEIRO — 1 pergunta × N usuários
 *   4. RESUMO — totais e posições
 *
 * Encoding: UTF-8 com BOM (Excel BR abre direto sem mexer em separator).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { classificadosParaMataMata, type JogoFinalizado } from "./classification";
import { fetchAll } from "./supabase-fetch-all";
import type { Grupo } from "@/types/database";

type SB = SupabaseClient;

const BOM = "﻿";

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '""';
  const s = String(v);
  // Sempre entre aspas. Aspas duplas internas viram aspas-duplas.
  return `"${s.replace(/"/g, '""')}"`;
}

function formatarDataIso(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return iso;
  }
}

export type CsvStats = {
  total_usuarios: number;
  total_palpites: number;
  tamanho_bytes: number;
};

export async function gerarCsvCompleto(
  supabase: SB,
): Promise<{ csv: string; stats: CsvStats }> {
  // ============== Loads em paralelo ==============
  // CT-21 da QW4: PostgREST do Supabase Cloud tem max_rows=1000 hard
  // cap. Tabelas potencialmente grandes (palpites_grupos com 2603+
  // entries no caso real) precisam ser paginadas via fetchAll().
  const [usuarios, matches, teams, players, palpitesGrupos, palpitesMata, palpitesArtilheiro, snapshots] =
    await Promise.all([
      fetchAll<any>(supabase, "users", "id, nome, nome_exibicao, pago, role", "nome_exibicao"),
      fetchAll<any>(
        supabase,
        "matches",
        "id, fase, rodada, grupo, time_casa_id, time_fora_id, data_hora, status, placar_casa, placar_fora",
        "data_hora",
      ),
      fetchAll<any>(supabase, "teams", "id, nome, codigo_fifa, grupo, ranking_fifa"),
      fetchAll<any>(supabase, "players", "id, nome, time_id, gols_torneio"),
      fetchAll<any>(
        supabase,
        "palpites_grupos",
        "user_id, match_id, placar_casa, placar_fora, pontos_calculados",
      ),
      fetchAll<any>(supabase, "palpites_mata", "user_id, time_id, fase, acertou"),
      fetchAll<any>(
        supabase,
        "palpites_artilheiro",
        "user_id, player_id, player_nome_manual, acertou",
      ),
      fetchAll<any>(
        supabase,
        "ranking_snapshots",
        "user_id, rodada_ordem, pontos_totais, pontos_rodada, posicao",
      ),
    ]);

  // ============== Lookups ==============
  const teamById = new Map(teams.map((t) => [t.id, t]));
  // Ranking FIFA pro desempate do R32 — o CSV tem que mostrar o mesmo R32
  // que o app/realidade. (item 52 estendido ao apostador)
  const rankingFifa = new Map<string, number>();
  for (const t of teams) {
    if (t.ranking_fifa != null) rankingFifa.set(t.id, t.ranking_fifa);
  }
  const playerById = new Map(players.map((p) => [p.id, p]));
  // palpite grupos: chave = `${user_id}|${match_id}`
  const pgKey = (uid: string, mid: string) => `${uid}|${mid}`;
  const palpiteGrupoIdx = new Map<string, any>();
  for (const p of palpitesGrupos) palpiteGrupoIdx.set(pgKey(p.user_id, p.match_id), p);
  // palpite mata: chave = `${user_id}|${fase}`, valor = array de time_ids
  const palpiteMataIdx = new Map<string, string[]>();
  for (const p of palpitesMata) {
    const k = `${p.user_id}|${p.fase}`;
    const arr = palpiteMataIdx.get(k) ?? [];
    arr.push(p.time_id);
    palpiteMataIdx.set(k, arr);
  }
  // palpite artilheiro: chave = user_id
  const palpiteArtIdx = new Map<string, any>();
  for (const p of palpitesArtilheiro) palpiteArtIdx.set(p.user_id, p);

  // ============== Headers comuns ==============
  const nomeColUsuario = (u: any) => (u.nome_exibicao as string) ?? u.nome;
  const usuariosCols = usuarios.map(nomeColUsuario);
  const usuariosColsCsv = usuariosCols.map((n) => csvEscape(n)).join(",");

  // ============== Seção 1: FASE DE GRUPOS ==============
  const linhasGrupos: string[] = [];
  linhasGrupos.push("[FASE DE GRUPOS]");
  linhasGrupos.push(
    [
      csvEscape("Rodada"),
      csvEscape("Data (Brasília)"),
      csvEscape("Grupo"),
      csvEscape("Time Casa"),
      csvEscape("Time Fora"),
      csvEscape("Placar Real"),
      usuariosColsCsv,
    ].join(","),
  );
  const jogosGrupos = matches.filter((m) => m.fase === "grupos");
  for (const jogo of jogosGrupos) {
    const casa = jogo.time_casa_id ? teamById.get(jogo.time_casa_id) : null;
    const fora = jogo.time_fora_id ? teamById.get(jogo.time_fora_id) : null;
    const placarReal =
      jogo.status === "finalizado" && jogo.placar_casa !== null && jogo.placar_fora !== null
        ? `${jogo.placar_casa}x${jogo.placar_fora}`
        : "(pendente)";
    const palpitesCols = usuarios.map((u) => {
      const p = palpiteGrupoIdx.get(pgKey(u.id, jogo.id));
      return csvEscape(p ? `${p.placar_casa}x${p.placar_fora}` : "-");
    });
    linhasGrupos.push(
      [
        csvEscape(`R${jogo.rodada ?? ""}`),
        csvEscape(formatarDataIso(jogo.data_hora)),
        csvEscape(jogo.grupo ?? ""),
        csvEscape(casa?.nome ?? "TBD"),
        csvEscape(fora?.nome ?? "TBD"),
        csvEscape(placarReal),
        palpitesCols.join(","),
      ].join(","),
    );
  }

  // ============== Seção 2: MATA-MATA (por fase) ==============
  const linhasMata: string[] = [];
  linhasMata.push("");
  linhasMata.push("[MATA-MATA]");
  linhasMata.push(
    [csvEscape("Fase"), csvEscape("Time Palpitado (count)"), usuariosColsCsv].join(","),
  );
  // Linha "16 avos" — os 32 classificados pelos palpites de grupos de
  // cada user (regulamento FIFA: 1º + 2º de cada grupo + 8 melhores 3ºs).
  // Calculado a partir dos palpites_grupos do user.
  const matchesGruposById = new Map(
    matches.filter((m) => m.fase === "grupos").map((m) => [m.id, m]),
  );
  function jogosVirtuaisDoUser(userId: string): JogoFinalizado[] {
    const out: JogoFinalizado[] = [];
    for (const p of palpitesGrupos) {
      if (p.user_id !== userId) continue;
      const m = matchesGruposById.get(p.match_id);
      if (!m || !m.grupo || !m.time_casa_id || !m.time_fora_id) continue;
      out.push({
        grupo: m.grupo as Grupo,
        time_casa_id: m.time_casa_id,
        time_fora_id: m.time_fora_id,
        placar_casa: p.placar_casa,
        placar_fora: p.placar_fora,
      });
    }
    return out;
  }
  const cols16avos = usuarios.map((u) => {
    const jogos = jogosVirtuaisDoUser(u.id);
    if (jogos.length === 0) return csvEscape("-");
    try {
      const r = classificadosParaMataMata(jogos, rankingFifa);
      const nomes = r.todosClassificados
        .map((t) => teamById.get(t.time_id)?.nome ?? "?")
        .join(", ");
      return csvEscape(nomes || "-");
    } catch {
      return csvEscape("(palpites incompletos)");
    }
  });
  linhasMata.push(
    [
      csvEscape("16 avos (32 classificados)"),
      csvEscape("(do palpite de grupos)"),
      cols16avos.join(","),
    ].join(","),
  );

  // Demais fases — palpitadas manualmente
  const ORDEM_FASES: Array<{ chave: string; label: string }> = [
    { chave: "8avos", label: "Oitavas (16 picks)" },
    { chave: "quartas", label: "Quartas (8 picks)" },
    { chave: "semi", label: "Semi (4 picks)" },
    { chave: "final", label: "Final (2 picks)" },
    { chave: "campeao", label: "Campeão (1 pick)" },
  ];
  for (const f of ORDEM_FASES) {
    const cols = usuarios.map((u) => {
      const timeIds = palpiteMataIdx.get(`${u.id}|${f.chave}`) ?? [];
      const nomes = timeIds.map((tid) => teamById.get(tid)?.nome ?? "?").join(", ");
      return csvEscape(nomes || "-");
    });
    linhasMata.push([csvEscape(f.label), csvEscape("(consolidado)"), cols.join(",")].join(","));
  }

  // ============== Seção 3: ARTILHEIRO ==============
  const linhasArt: string[] = [];
  linhasArt.push("");
  linhasArt.push("[ARTILHEIRO]");
  linhasArt.push([csvEscape("Pergunta"), csvEscape("Status"), usuariosColsCsv].join(","));
  const colsArt = usuarios.map((u) => {
    const p = palpiteArtIdx.get(u.id);
    if (!p) return csvEscape("-");
    if (p.player_id) return csvEscape(playerById.get(p.player_id)?.nome ?? "?");
    return csvEscape(p.player_nome_manual ?? "?");
  });
  linhasArt.push(
    [csvEscape("Artilheiro da Copa"), csvEscape("Aguardando fim da Copa"), colsArt.join(",")].join(
      ",",
    ),
  );

  // ============== Seção 4: RESUMO ==============
  const linhasResumo: string[] = [];
  linhasResumo.push("");
  linhasResumo.push("[RESUMO]");
  linhasResumo.push(
    [
      csvEscape("Usuário"),
      csvEscape("Pago"),
      csvEscape("Role"),
      csvEscape("Pontos Totais"),
      csvEscape("Posição (última rodada)"),
    ].join(","),
  );
  // Pega snapshot da ultima rodada por user
  const ultimaOrdemPorUser = new Map<string, number>();
  for (const s of snapshots) {
    const cur = ultimaOrdemPorUser.get(s.user_id) ?? -1;
    if (s.rodada_ordem > cur) ultimaOrdemPorUser.set(s.user_id, s.rodada_ordem);
  }
  const snapPorUser = new Map<string, any>();
  for (const s of snapshots) {
    if (s.rodada_ordem === ultimaOrdemPorUser.get(s.user_id)) {
      snapPorUser.set(s.user_id, s);
    }
  }
  for (const u of usuarios) {
    const snap = snapPorUser.get(u.id);
    linhasResumo.push(
      [
        csvEscape(nomeColUsuario(u)),
        csvEscape(u.pago ? "Sim" : "Não"),
        csvEscape(u.role ?? "user"),
        csvEscape(snap?.pontos_totais ?? 0),
        csvEscape(snap?.posicao ?? "—"),
      ].join(","),
    );
  }

  // ============== Junta tudo ==============
  const csv =
    BOM +
    [...linhasGrupos, ...linhasMata, ...linhasArt, ...linhasResumo].join("\n") +
    "\n";

  const stats: CsvStats = {
    total_usuarios: usuarios.length,
    total_palpites: palpitesGrupos.length + palpitesMata.length + palpitesArtilheiro.length,
    tamanho_bytes: new Blob([csv]).size,
  };

  return { csv, stats };
}
