/* eslint-disable no-console */
/**
 * Aplica as datas/horários OFICIAIS da fase de grupos (FIFA 2026) aos
 * jogos já existentes no banco — atualiza SOMENTE `matches.data_hora`.
 *
 * Não toca em times, palpites ou qualquer outra coluna. O matching é por
 * grupo + rodada + PAR de times (não-ordenado), então inversão casa/fora
 * entre a tabela oficial e o banco não atrapalha.
 *
 * Idempotente: pode rodar quantas vezes quiser.
 *
 * Rodar:  npx tsx scripts/aplicar-datas-fifa.ts
 *   (use --dry pra só simular, sem gravar)
 */
import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { MAPA_KICKOFF_GRUPOS, chaveFixture } from "../src/data/world-cup-2026-schedule";

dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

const DRY = process.argv.includes("--dry");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: teams } = await sb.from("teams").select("id, nome");
  const nome = new Map((teams ?? []).map((t) => [t.id, t.nome as string]));

  const { data: matches, error } = await sb
    .from("matches")
    .select("id, grupo, rodada, time_casa_id, time_fora_id, data_hora")
    .eq("fase", "grupos");
  if (error) throw error;

  let ok = 0;
  let semMatch = 0;
  let inalterado = 0;
  const naoEncontrados: string[] = [];

  for (const m of matches ?? []) {
    const casa = nome.get(m.time_casa_id as string) ?? "?";
    const fora = nome.get(m.time_fora_id as string) ?? "?";
    const chave = chaveFixture(m.grupo as string, m.rodada as number, casa, fora);
    const kickoffLocal = MAPA_KICKOFF_GRUPOS[chave];
    if (!kickoffLocal) {
      semMatch++;
      naoEncontrados.push(`G${m.grupo} R${m.rodada} ${casa} x ${fora}`);
      continue;
    }
    const utc = new Date(kickoffLocal).toISOString();
    if (m.data_hora && new Date(m.data_hora).toISOString() === utc) {
      inalterado++;
      continue;
    }
    if (DRY) {
      console.log(`[dry] G${m.grupo} R${m.rodada} ${casa} x ${fora}: ${m.data_hora} → ${utc}`);
      ok++;
      continue;
    }
    const { error: upErr } = await sb.from("matches").update({ data_hora: utc }).eq("id", m.id);
    if (upErr) {
      console.error(`ERRO ao atualizar ${casa} x ${fora}:`, upErr.message);
      continue;
    }
    ok++;
  }

  console.log(`\n${DRY ? "[DRY-RUN] " : ""}Resultado:`);
  console.log(`  Atualizados: ${ok}`);
  console.log(`  Já corretos: ${inalterado}`);
  console.log(`  Sem match na tabela: ${semMatch}`);
  if (naoEncontrados.length) {
    console.log("  --- não encontrados na tabela oficial ---");
    naoEncontrados.forEach((s) => console.log("   " + s));
  }
  console.log(`  Total jogos de grupos no banco: ${matches?.length ?? 0}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
