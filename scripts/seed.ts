/* eslint-disable no-console */
/**
 * Seed do Bolão da AutoManagem.
 *
 *  - 48 seleções (Copa 2026)
 *  - 50 jogadores candidatos a artilheiro
 *  - 72 jogos da fase de grupos
 *  - 30 usuários fictícios (usuario1@test.com … usuario30@test.com, senha "senha123")
 *  - Usuário #1 = admin; ~5 usuários não pagos
 *  - Palpites completos (grupos + mata-mata + artilheiro) por usuário
 *  - Resultados simulados de TODOS os jogos até a final
 *  - Recálculo final que gera as 8 ranking_snapshots por usuário
 *
 * Pré-requisitos:
 *  - .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *  - Migrations rodadas (npx supabase db push ou via SQL editor)
 *
 * Rodar:  npm run seed
 */

import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  SELECOES,
  bandeiraUrl,
  ARTILHEIROS_CANDIDATOS,
  FASES_MATA_MATA,
  RANKING_FIFA,
} from "../src/data/world-cup-2026";
import { CALENDARIO_GRUPOS_2026 } from "../src/data/world-cup-2026-schedule";
import type { Database, FasePalpiteMata, Grupo } from "../src/types/database";
import { classificadosParaMataMata } from "../src/lib/classification";
import { recalcularTudo } from "../src/lib/recalc";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[seed] Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// =====================================================================
// Utils
// =====================================================================
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const NOMES_FAKE = [
  "Fernando Silva", "Marina Oliveira", "Lucas Costa", "Beatriz Lima", "Rafael Souza",
  "Camila Pereira", "Daniel Santos", "Isabela Rocha", "Pedro Almeida", "Letícia Gomes",
  "Bruno Martins", "Júlia Ferreira", "Gustavo Carvalho", "Helena Ribeiro", "Thiago Barbosa",
  "Mariana Castro", "André Nascimento", "Sofia Mendes", "Felipe Araújo", "Larissa Cardoso",
  "Diego Pinto", "Carolina Dias", "Henrique Moura", "Patrícia Lopes", "Roberto Teixeira",
  "Amanda Vieira", "Marcelo Cunha", "Vanessa Freitas", "Eduardo Pires", "Renata Cavalcanti",
];

// =====================================================================
// 1) TIMES
// =====================================================================
async function seedTeams() {
  console.log("→ Times (48)…");
  // limpa primeiro
  await supabase.from("teams").delete().gt("created_at", "1900-01-01");
  const rows = SELECOES.map((s) => ({
    nome: s.nome,
    codigo_fifa: s.codigo,
    bandeira_url: bandeiraUrl(s.codigo, 160),
    grupo: s.grupo,
    tbd: s.tbd ?? false,
    ranking_fifa: RANKING_FIFA[s.nome] ?? null,
  }));
  const { error } = await supabase.from("teams").insert(rows as any);
  if (error) throw error;
  console.log(`   ✓ ${rows.length} times inseridos`);
}

// =====================================================================
// 2) PLAYERS
// =====================================================================
async function seedPlayers() {
  console.log("→ Jogadores…");
  await supabase.from("players").delete().gt("created_at", "1900-01-01");

  const { data: teams } = await supabase.from("teams").select("id, nome");
  if (!teams) throw new Error("Times não encontrados");
  const teamByName = new Map(teams.map((t) => [t.nome, t.id]));

  const rows = ARTILHEIROS_CANDIDATOS.map((p) => ({
    nome: p.nome,
    time_id: teamByName.get(p.selecao) ?? null,
    gols_torneio: 0,
  }));
  const { error } = await supabase.from("players").insert(rows as any);
  if (error) throw error;
  console.log(`   ✓ ${rows.length} jogadores inseridos`);
}

// =====================================================================
// 3) MATCHES — fase de grupos
// =====================================================================
async function seedMatchesGrupos() {
  console.log("→ Jogos da fase de grupos (72)…");
  await supabase.from("matches").delete().gt("created_at", "1900-01-01");

  const { data: teams } = await supabase.from("teams").select("id, nome");
  if (!teams) throw new Error("Times não encontrados");

  // Confrontos + datas/horários OFICIAIS da FIFA 2026 (CALENDARIO_GRUPOS_2026).
  // Os times são resolvidos por NOME (== teams.nome). `kickoff` é o horário
  // local da sede com offset → toISOString() grava o UTC correto. Assim o
  // seed já nasce com pareamentos e datas reais (sem precisar do script
  // aplicar-datas-fifa.ts depois).
  const idPorNome = new Map(teams.map((t) => [t.nome as string, t.id as string]));

  const rows = CALENDARIO_GRUPOS_2026.map((f) => {
    const casaId = idPorNome.get(f.casa);
    const foraId = idPorNome.get(f.fora);
    if (!casaId || !foraId) {
      throw new Error(`Time do calendário não encontrado em teams: "${f.casa}" ou "${f.fora}"`);
    }
    return {
      fase: "grupos" as const,
      rodada: f.rodada,
      grupo: f.grupo,
      time_casa_id: casaId,
      time_fora_id: foraId,
      data_hora: new Date(f.kickoff).toISOString(),
      status: "agendado" as const,
    };
  });

  const { error } = await supabase.from("matches").insert(rows as any);
  if (error) throw error;
  console.log(`   ✓ ${rows.length} jogos da fase de grupos (confrontos + datas oficiais FIFA)`);
}

// =====================================================================
// 4) USUÁRIOS
// =====================================================================
async function seedUsuarios() {
  console.log("→ 30 usuários fictícios…");

  // Lista existentes pra evitar conflito
  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingEmails = new Set(existing?.users.map((u) => u.email));

  const usuarios: { id: string; nome: string; email: string; pago: boolean; admin: boolean }[] = [];

  for (let i = 1; i <= 30; i++) {
    const email = `usuario${i}@test.com`;
    const nome = NOMES_FAKE[i - 1];
    let userId: string | undefined;
    if (existingEmails.has(email)) {
      const u = existing!.users.find((u) => u.email === email)!;
      userId = u.id;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "senha123",
        email_confirm: true,
        user_metadata: { nome },
      });
      if (error) {
        console.warn(`   ! Falha ao criar ${email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    }
    if (!userId) continue;
    const pago = i > 5; // primeiros 5 não pagaram (pra demonstrar o filtro)
    const admin = i === 1;
    usuarios.push({ id: userId, nome, email, pago, admin });
  }

  // Garante public.users sincronizado (sobrescreve role/pago/nome — email
  // mantém o do auth.users, que é o usado pra login)
  for (const u of usuarios) {
    await supabase
      .from("users")
      .upsert(
        {
          id: u.id,
          nome: u.nome,
          email: u.email,
          role: u.admin ? "admin" : "user",
          pago: u.pago,
        } as any,
        { onConflict: "id" },
      );
  }

  console.log(`   ✓ ${usuarios.length} usuários (${usuarios.filter((u) => u.pago).length} pagos, 1 admin)`);
  return usuarios;
}

// =====================================================================
// 5) SIMULA RESULTADOS DA FASE DE GRUPOS + GERA MATA-MATA
// =====================================================================
async function simularResultadosGrupos() {
  console.log("→ Simulando resultados da fase de grupos…");
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("fase", "grupos");
  if (!matches) throw new Error("Sem jogos");

  for (const m of matches) {
    // 0-4 gols, viés realista (Poisson-like com média 1.3)
    const c = pick([0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4]);
    const f = pick([0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4]);
    await supabase
      .from("matches")
      .update({ placar_casa: c, placar_fora: f, status: "finalizado" })
      .eq("id", m.id);
  }
  console.log(`   ✓ ${matches.length} jogos finalizados`);
}

async function gerarBracketEMataMata() {
  console.log("→ Gerando bracket de mata-mata + resultados simulados…");

  // Busca todos os jogos finalizados de grupos + times
  const { data: jogos } = await supabase
    .from("matches")
    .select("grupo, time_casa_id, time_fora_id, placar_casa, placar_fora")
    .eq("fase", "grupos")
    .eq("status", "finalizado");

  if (!jogos) throw new Error("Sem jogos de grupos finalizados");

  const classif = classificadosParaMataMata(
    jogos.map((j) => ({
      grupo: j.grupo as Grupo,
      time_casa_id: j.time_casa_id!,
      time_fora_id: j.time_fora_id!,
      placar_casa: j.placar_casa!,
      placar_fora: j.placar_fora!,
    })),
  );

  // 32 classificados
  let times = classif.todosClassificados.map((t) => t.time_id);
  if (times.length !== 32) {
    console.warn(`   ! Esperado 32 classificados, obteve ${times.length}. Continuando assim mesmo.`);
  }
  // Embaralha mais ou menos pra simular sorteio de chave (não é o sorteio real da FIFA mas é OK pro seed)
  times = shuffle(times);

  // Mapeia: 32 → 16 → 8 → 4 → 2 → 1
  let baseDate = new Date(FASES_MATA_MATA[0].inicio);

  async function jogarFase(
    fase: "16avos" | "8avos" | "quartas" | "semi" | "final",
    teams: string[],
  ): Promise<string[]> {
    const vencedores: string[] = [];
    const insertRows: any[] = [];
    for (let i = 0; i < teams.length; i += 2) {
      const casa = teams[i];
      const fora = teams[i + 1];
      let c = pick([0, 1, 1, 1, 2, 2, 3]);
      let f = pick([0, 1, 1, 1, 2, 2, 3]);
      // Sem empate no mata-mata
      if (c === f) {
        if (Math.random() > 0.5) c++; else f++;
      }
      const winner = c > f ? casa : fora;
      vencedores.push(winner);
      insertRows.push({
        fase,
        rodada: null,
        grupo: null,
        time_casa_id: casa,
        time_fora_id: fora,
        placar_casa: c,
        placar_fora: f,
        data_hora: new Date(baseDate.getTime() + i * 2 * 3600_000).toISOString(),
        status: "finalizado",
        ordem: i / 2,
      });
    }
    await supabase.from("matches").insert(insertRows);
    return vencedores;
  }

  // 16 avos (32 → 16)
  const oitavas = await jogarFase("16avos", times);
  baseDate = new Date(FASES_MATA_MATA[1].inicio);
  const quartas = await jogarFase("8avos", oitavas);
  baseDate = new Date(FASES_MATA_MATA[2].inicio);
  const semis = await jogarFase("quartas", quartas);
  baseDate = new Date(FASES_MATA_MATA[3].inicio);
  const final = await jogarFase("semi", semis);
  baseDate = new Date(FASES_MATA_MATA[5].inicio);
  await jogarFase("final", final);

  console.log(`   ✓ Mata-mata completo (campeão: time_id = ${final[0]})`);
}

// =====================================================================
// 6) PALPITES POR USUÁRIO
// =====================================================================
async function seedPalpites(usuarios: { id: string }[]) {
  console.log("→ Palpites de todos os usuários…");

  const { data: matches } = await supabase
    .from("matches")
    .select("id, fase, status")
    .eq("fase", "grupos");
  const { data: teams } = await supabase.from("teams").select("id");
  const { data: players } = await supabase.from("players").select("id");
  if (!matches || !teams || !players) throw new Error("Pré-requisitos não atendidos");

  const teamIds = teams.map((t) => t.id);

  for (const u of usuarios) {
    // a) palpites da fase de grupos — placares aleatórios
    const palpitesGrupos = matches.map((m) => ({
      user_id: u.id,
      match_id: m.id,
      placar_casa: pick([0, 0, 1, 1, 1, 2, 2, 3, 4]),
      placar_fora: pick([0, 0, 1, 1, 1, 2, 2, 3, 4]),
    }));
    // Insere em chunks pra evitar payload grande
    for (let i = 0; i < palpitesGrupos.length; i += 50) {
      await supabase
        .from("palpites_grupos")
        .upsert(palpitesGrupos.slice(i, i + 50) as any, { onConflict: "user_id,match_id" });
    }

    // b) palpites do mata-mata — sorteio progressivo (sem 16avos: é auto-classificação)
    const r16 = shuffle(teamIds).slice(0, 16);
    const qf = shuffle(r16).slice(0, 8);
    const sf = shuffle(qf).slice(0, 4);
    const finalistas = shuffle(sf).slice(0, 2);
    const camp = finalistas[0];

    const rowsMata: { user_id: string; time_id: string; fase: FasePalpiteMata }[] = [];
    for (const t of r16) rowsMata.push({ user_id: u.id, time_id: t, fase: "8avos" });
    for (const t of qf) rowsMata.push({ user_id: u.id, time_id: t, fase: "quartas" });
    for (const t of sf) rowsMata.push({ user_id: u.id, time_id: t, fase: "semi" });
    for (const t of finalistas) rowsMata.push({ user_id: u.id, time_id: t, fase: "final" });
    rowsMata.push({ user_id: u.id, time_id: camp, fase: "campeao" });

    await supabase.from("palpites_mata").delete().eq("user_id", u.id);
    await supabase.from("palpites_mata").insert(rowsMata as any);

    // c) palpite de artilheiro
    const artilheiro = pick(players);
    await supabase
      .from("palpites_artilheiro")
      .upsert({ user_id: u.id, player_id: artilheiro.id } as any, { onConflict: "user_id" });
  }
  console.log(`   ✓ Palpites de ${usuarios.length} usuários`);
}

// =====================================================================
// 7) DEFINE ARTILHEIRO SIMULADO
// =====================================================================
async function simularArtilheiro() {
  console.log("→ Simulando artilheiro do torneio…");
  const { data: players } = await supabase.from("players").select("id");
  if (!players) return;
  // 3 jogadores com 6, 5, 5 gols
  const top = shuffle(players).slice(0, 3);
  await supabase.from("players").update({ gols_torneio: 6 }).eq("id", top[0].id);
  await supabase.from("players").update({ gols_torneio: 5 }).eq("id", top[1].id);
  await supabase.from("players").update({ gols_torneio: 5 }).eq("id", top[2].id);
  // Distribui alguns gols pra outros 10
  for (const p of shuffle(players).slice(3, 13)) {
    await supabase.from("players").update({ gols_torneio: rand(1, 4) }).eq("id", p.id);
  }
  console.log("   ✓ Artilheiro definido");
}

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  console.log("\n🏆 Seed do Bolão da AutoManagem · Copa 2026\n");
  await seedTeams();
  await seedPlayers();
  await seedMatchesGrupos();
  const usuarios = await seedUsuarios();
  await seedPalpites(usuarios);
  await simularResultadosGrupos();
  await gerarBracketEMataMata();
  await simularArtilheiro();

  console.log("→ Recalculando pontuações + snapshots…");
  await recalcularTudo(supabase as any);
  console.log("   ✓ Recalculo completo");

  console.log("\n✅ Seed concluído!");
  console.log("\nAcesse:");
  console.log("  Admin (usuario1@test.com / senha123) → /admin");
  console.log("  Demais (usuario2@test.com … usuario30@test.com / senha123)");
}

main().catch((e) => {
  console.error("\n❌ Erro no seed:", e);
  process.exit(1);
});
