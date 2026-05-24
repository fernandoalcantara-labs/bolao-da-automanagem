/* eslint-disable no-console */
// TEMP A2 — sonda RLS read-only com a ANON key (chave pública). Tenta ler
// dados sensíveis SEM autenticação. Se vier linha de palpite alheio, é furo.
import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(url, anon, { auth: { persistSession: false } });

async function probe(tabela: string, cols = "*") {
  const { data, error, count } = await sb.from(tabela).select(cols, { count: "exact" }).limit(3);
  if (error) {
    console.log(`  ${tabela}: ❌ erro (${error.code ?? ""} ${error.message.slice(0, 60)}) → provavelmente RLS bloqueando (BOM)`);
  } else {
    console.log(`  ${tabela}: ⚠️ retornou ${count ?? data?.length} linha(s) sem login`);
    if (data && data.length) console.log(`     amostra: ${JSON.stringify(data[0]).slice(0, 140)}`);
  }
}

async function main() {
  console.log("== Sonda RLS (anon, sem login) ==");
  console.log("Esperado: palpites de OUTROS usuários NÃO devem vir. Ranking/config podem ser públicos.");
  await probe("palpites_grupos");
  await probe("palpites_mata");
  await probe("palpites_artilheiro");
  await probe("users", "id, nome, email, telefone, pago, role");
  await probe("config");
  await probe("ranking_snapshots");
  await probe("matches", "id, status");
  await probe("teams", "id, nome");
}
main().catch((e) => { console.error(e); process.exit(1); });
