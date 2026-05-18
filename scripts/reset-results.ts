/* eslint-disable no-console */
/**
 * Reset de resultados — zera todos os placares de jogos e snapshots
 * de ranking, MAS mantém users, palpites, times, jogadores e config.
 *
 * Útil para limpar a simulação inicial antes da Copa real começar.
 *
 * Uso:  npm run reset-results
 */

import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[reset] Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function confirmar() {
  // Permite pular confirmação com --yes (útil pra CI ou execução automatizada)
  if (process.argv.includes("--yes") || process.argv.includes("-y")) return;

  const rl = readline.createInterface({ input, output });
  console.log("\n⚠️  Esta ação vai apagar TODOS os resultados de jogos e snapshots de ranking.");
  console.log("    Os usuários e palpites serão MANTIDOS.\n");
  const resp = await rl.question("Tem certeza? Digite 'CONFIRMAR' para prosseguir: ");
  rl.close();
  if (resp.trim() !== "CONFIRMAR") {
    console.log("\nCancelado.");
    process.exit(0);
  }
}

async function contar(tabela: string) {
  const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true });
  return count ?? 0;
}

async function main() {
  console.log("\n🔄 Reset de resultados · Bolão da AutoManagem\n");
  await confirmar();

  console.log("\n→ Removendo snapshots de ranking…");
  const snapshotsAntes = await contar("ranking_snapshots");
  await supabase
    .from("ranking_snapshots")
    .delete()
    .neq("user_id", "00000000-0000-0000-0000-000000000000");
  console.log(`   ✓ ${snapshotsAntes} snapshots removidas`);

  console.log("→ Resetando jogos (placares + status)…");
  // Conta jogos primeiro
  const jogos = await contar("matches");
  // Apaga jogos de mata-mata (criados pelo seed) — eles serão recriados pelo sync da API
  const { error: errMata } = await supabase
    .from("matches")
    .delete()
    .in("fase", ["16avos", "8avos", "quartas", "semi", "3lugar", "final"]);
  if (errMata) throw errMata;

  // Reseta os de grupos
  const { error: errReset } = await supabase
    .from("matches")
    .update({
      placar_casa: null,
      placar_fora: null,
      status: "agendado",
      editado_manualmente: false,
    })
    .eq("fase", "grupos");
  if (errReset) throw errReset;
  console.log(`   ✓ ${jogos} jogos resetados (grupos limpos, mata-mata removido)`);

  console.log("→ Zerando pontuações dos palpites…");
  // Zera pontos_calculados de palpites_grupos
  await supabase
    .from("palpites_grupos")
    .update({ pontos_calculados: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  // Zera acertou de palpites_mata e palpites_artilheiro
  await supabase
    .from("palpites_mata")
    .update({ acertou: false })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("palpites_artilheiro")
    .update({ acertou: false })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  // Zera gols dos jogadores (artilheiro)
  await supabase
    .from("players")
    .update({ gols_torneio: 0 })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  const palpitesG = await contar("palpites_grupos");
  const palpitesM = await contar("palpites_mata");
  const palpitesA = await contar("palpites_artilheiro");
  const users = await contar("users");

  console.log("\n✅ Reset concluído!");
  console.log("\nResumo:");
  console.log(`   ${jogos} jogos resetados (placares zerados)`);
  console.log(`   ${snapshotsAntes} snapshots removidas`);
  console.log(`   ${palpitesG} palpites de grupos mantidos (pontos zerados)`);
  console.log(`   ${palpitesM} palpites de mata-mata mantidos`);
  console.log(`   ${palpitesA} palpites de artilheiro mantidos`);
  console.log(`   ${users} usuários mantidos`);
  console.log("\nO painel público agora mostra ranking vazio/zerado.");
  console.log("Use o /admin → Sincronizar com API quando os jogos reais começarem.\n");
}

main().catch((e) => {
  console.error("\n❌ Erro no reset:", e);
  process.exit(1);
});
