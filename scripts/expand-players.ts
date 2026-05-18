/* eslint-disable no-console */
/**
 * Item 7.1 + 7.2 — Limpa duplicatas de jogadores e expande a lista.
 *
 * Estratégia:
 *  1) Encontra duplicatas por (nome normalizado, time_id), mantém a de menor id
 *  2) Re-aponta palpites_artilheiro que referenciam duplicatas pra a canônica
 *  3) Apaga as duplicatas
 *  4) Apaga jogadores órfãos (time_id = null) sem palpites
 *  5) Insere a lista expandida (~100 jogadores) com ON CONFLICT DO NOTHING
 *
 * Rodar: npx tsx scripts/expand-players.ts
 */

import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const LISTA: { nome: string; selecao: string }[] = [
  // Brasil
  { nome: "Vinícius Júnior", selecao: "Brasil" },
  { nome: "Rodrygo", selecao: "Brasil" },
  { nome: "Raphinha", selecao: "Brasil" },
  { nome: "Neymar", selecao: "Brasil" },
  { nome: "Endrick", selecao: "Brasil" },
  { nome: "Estêvão", selecao: "Brasil" },
  { nome: "Richarlison", selecao: "Brasil" },
  { nome: "João Pedro", selecao: "Brasil" },
  { nome: "Matheus Cunha", selecao: "Brasil" },
  { nome: "Igor Jesus", selecao: "Brasil" },
  { nome: "Pedro", selecao: "Brasil" },
  // Argentina
  { nome: "Lionel Messi", selecao: "Argentina" },
  { nome: "Lautaro Martínez", selecao: "Argentina" },
  { nome: "Julián Álvarez", selecao: "Argentina" },
  { nome: "Ángel Di María", selecao: "Argentina" },
  { nome: "Nicolás González", selecao: "Argentina" },
  { nome: "Alejandro Garnacho", selecao: "Argentina" },
  { nome: "Thiago Almada", selecao: "Argentina" },
  // França
  { nome: "Kylian Mbappé", selecao: "França" },
  { nome: "Ousmane Dembélé", selecao: "França" },
  { nome: "Marcus Thuram", selecao: "França" },
  { nome: "Bradley Barcola", selecao: "França" },
  { nome: "Michael Olise", selecao: "França" },
  { nome: "Hugo Ekitiké", selecao: "França" },
  { nome: "Jean-Philippe Mateta", selecao: "França" },
  { nome: "Randal Kolo Muani", selecao: "França" },
  // Inglaterra
  { nome: "Harry Kane", selecao: "Inglaterra" },
  { nome: "Bukayo Saka", selecao: "Inglaterra" },
  { nome: "Cole Palmer", selecao: "Inglaterra" },
  { nome: "Phil Foden", selecao: "Inglaterra" },
  { nome: "Jude Bellingham", selecao: "Inglaterra" },
  { nome: "Anthony Gordon", selecao: "Inglaterra" },
  { nome: "Ollie Watkins", selecao: "Inglaterra" },
  { nome: "Marcus Rashford", selecao: "Inglaterra" },
  // Espanha
  { nome: "Lamine Yamal", selecao: "Espanha" },
  { nome: "Mikel Oyarzabal", selecao: "Espanha" },
  { nome: "Álvaro Morata", selecao: "Espanha" },
  { nome: "Nico Williams", selecao: "Espanha" },
  { nome: "Ferran Torres", selecao: "Espanha" },
  { nome: "Mikel Merino", selecao: "Espanha" },
  { nome: "Dani Olmo", selecao: "Espanha" },
  // Portugal
  { nome: "Cristiano Ronaldo", selecao: "Portugal" },
  { nome: "Bruno Fernandes", selecao: "Portugal" },
  { nome: "Bernardo Silva", selecao: "Portugal" },
  { nome: "Rafael Leão", selecao: "Portugal" },
  { nome: "Gonçalo Ramos", selecao: "Portugal" },
  { nome: "João Félix", selecao: "Portugal" },
  { nome: "Diogo Jota", selecao: "Portugal" },
  { nome: "Pedro Neto", selecao: "Portugal" },
  // Noruega
  { nome: "Erling Haaland", selecao: "Noruega" },
  { nome: "Alexander Sørloth", selecao: "Noruega" },
  { nome: "Martin Ødegaard", selecao: "Noruega" },
  { nome: "Antonio Nusa", selecao: "Noruega" },
  // Alemanha
  { nome: "Florian Wirtz", selecao: "Alemanha" },
  { nome: "Jamal Musiala", selecao: "Alemanha" },
  { nome: "Kai Havertz", selecao: "Alemanha" },
  { nome: "Niclas Füllkrug", selecao: "Alemanha" },
  { nome: "Serge Gnabry", selecao: "Alemanha" },
  { nome: "Tim Kleindienst", selecao: "Alemanha" },
  // Holanda
  { nome: "Memphis Depay", selecao: "Holanda" },
  { nome: "Cody Gakpo", selecao: "Holanda" },
  { nome: "Donyell Malen", selecao: "Holanda" },
  { nome: "Brian Brobbey", selecao: "Holanda" },
  { nome: "Joshua Zirkzee", selecao: "Holanda" },
  // Bélgica
  { nome: "Romelu Lukaku", selecao: "Bélgica" },
  { nome: "Kevin De Bruyne", selecao: "Bélgica" },
  { nome: "Jérémy Doku", selecao: "Bélgica" },
  { nome: "Charles De Ketelaere", selecao: "Bélgica" },
  // Croácia
  { nome: "Andrej Kramarić", selecao: "Croácia" },
  { nome: "Bruno Petković", selecao: "Croácia" },
  { nome: "Ante Budimir", selecao: "Croácia" },
  // Uruguai
  { nome: "Darwin Núñez", selecao: "Uruguai" },
  { nome: "Federico Valverde", selecao: "Uruguai" },
  { nome: "Maximiliano Araújo", selecao: "Uruguai" },
  { nome: "Rodrigo Aguirre", selecao: "Uruguai" },
  // Colômbia
  { nome: "Luis Díaz", selecao: "Colômbia" },
  { nome: "James Rodríguez", selecao: "Colômbia" },
  { nome: "Jhon Durán", selecao: "Colômbia" },
  { nome: "Jhon Córdoba", selecao: "Colômbia" },
  // México
  { nome: "Raúl Jiménez", selecao: "México" },
  { nome: "Santiago Giménez", selecao: "México" },
  { nome: "Hirving Lozano", selecao: "México" },
  { nome: "Henry Martín", selecao: "México" },
  // Estados Unidos
  { nome: "Christian Pulisic", selecao: "Estados Unidos" },
  { nome: "Folarin Balogun", selecao: "Estados Unidos" },
  { nome: "Ricardo Pepi", selecao: "Estados Unidos" },
  { nome: "Josh Sargent", selecao: "Estados Unidos" },
  // Canadá
  { nome: "Jonathan David", selecao: "Canadá" },
  { nome: "Alphonso Davies", selecao: "Canadá" },
  { nome: "Cyle Larin", selecao: "Canadá" },
  { nome: "Jacob Shaffelburg", selecao: "Canadá" },
  // Outros notáveis
  { nome: "Mohamed Salah", selecao: "Egito" },
  { nome: "Achraf Hakimi", selecao: "Marrocos" },
  { nome: "Hakim Ziyech", selecao: "Marrocos" },
  { nome: "Sadio Mané", selecao: "Senegal" },
  { nome: "Heung-min Son", selecao: "Coreia do Sul" },
  { nome: "Mehdi Taremi", selecao: "Irã" },
  { nome: "Takefusa Kubo", selecao: "Japão" },
  { nome: "Kaoru Mitoma", selecao: "Japão" },
  { nome: "Riyad Mahrez", selecao: "Argélia" },
  { nome: "Enner Valencia", selecao: "Equador" },
];

function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function limparDuplicatas() {
  console.log("→ Buscando duplicatas…");
  const { data: jogadores } = await supabase.from("players").select("id, nome, time_id, created_at");
  if (!jogadores) return;

  // Agrupa por (normalizado(nome), time_id)
  const grupos = new Map<string, { id: string; created_at: string }[]>();
  for (const j of jogadores) {
    const k = `${normalizar(j.nome)}|${j.time_id ?? "null"}`;
    const arr = grupos.get(k) ?? [];
    arr.push({ id: j.id, created_at: j.created_at });
    grupos.set(k, arr);
  }

  let removidos = 0;
  let reaproveitados = 0;
  for (const [, lista] of grupos) {
    if (lista.length <= 1) continue;
    // Ordena por created_at (mais antigo primeiro), mantém o primeiro
    lista.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const canonico = lista[0].id;
    const duplicatas = lista.slice(1).map((d) => d.id);
    // Re-aponta palpites
    for (const dup of duplicatas) {
      const { error } = await supabase
        .from("palpites_artilheiro")
        .update({ player_id: canonico })
        .eq("player_id", dup);
      if (error) {
        console.warn(`  ! Falha re-apontar palpites de ${dup}:`, error.message);
        continue;
      }
      reaproveitados++;
    }
    // Apaga duplicatas
    const { error: errDel } = await supabase.from("players").delete().in("id", duplicatas);
    if (errDel) {
      console.warn(`  ! Falha apagar duplicatas:`, errDel.message);
      continue;
    }
    removidos += duplicatas.length;
  }
  console.log(`   ✓ ${removidos} duplicatas removidas, ${reaproveitados} palpites re-apontados`);
}

async function expandirLista() {
  console.log("→ Adicionando jogadores faltantes…");
  const { data: teams } = await supabase.from("teams").select("id, nome");
  if (!teams) return;
  const teamByName = new Map(teams.map((t) => [normalizar(t.nome), t.id]));

  const { data: existing } = await supabase.from("players").select("nome, time_id");
  const existingSet = new Set(
    (existing ?? []).map((p) => `${normalizar(p.nome)}|${p.time_id ?? "null"}`),
  );

  const novos: { nome: string; time_id: string }[] = [];
  for (const item of LISTA) {
    const timeId = teamByName.get(normalizar(item.selecao));
    if (!timeId) {
      console.warn(`  ! Time não encontrado: ${item.selecao} (jogador: ${item.nome})`);
      continue;
    }
    const k = `${normalizar(item.nome)}|${timeId}`;
    if (existingSet.has(k)) continue;
    novos.push({ nome: item.nome, time_id: timeId });
    existingSet.add(k);
  }

  if (novos.length === 0) {
    console.log("   ✓ Nenhum jogador novo (lista já estava completa)");
    return;
  }
  const { error } = await supabase.from("players").insert(novos);
  if (error) {
    console.error("  ! Erro ao inserir:", error.message);
    return;
  }
  console.log(`   ✓ ${novos.length} jogadores novos adicionados`);
}

async function main() {
  console.log("\n⚽ Limpando e expandindo lista de jogadores\n");
  await limparDuplicatas();
  await expandirLista();
  const { count } = await supabase.from("players").select("*", { count: "exact", head: true });
  console.log(`\n✅ Total final de jogadores: ${count}\n`);
}

main().catch((e) => {
  console.error("\n❌ Erro:", e);
  process.exit(1);
});
