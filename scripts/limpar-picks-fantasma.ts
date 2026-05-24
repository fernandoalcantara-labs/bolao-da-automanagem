/* eslint-disable no-console */
/**
 * Remove picks "fantasma" de palpites_mata: times marcados numa fase do
 * mata-mata que NÃO estão mais no R32 atual do usuário (sobraram de quando
 * o user tinha outros palpites de grupos). Esses órfãos inflavam a
 * contagem e travavam o limite ("Limite atingido em Oitavas" com 15 picks).
 *
 * Conservador: só mexe em usuários cujo R32 resolve os 32 times (palpites
 * de grupos completos), onde dá pra identificar o fantasma com certeza.
 *
 * Rodar:  npx tsx scripts/limpar-picks-fantasma.ts        (aplica)
 *         npx tsx scripts/limpar-picks-fantasma.ts --dry   (só simula)
 */
import { config as dotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolverBracketR32 } from "../src/lib/bracket-2026";
import { timesValidosR32 } from "../src/lib/mata-mata-picks";
import type { JogoFinalizado } from "../src/lib/classification";
import type { Grupo } from "../src/types/database";
dotenv({ path: ".env.local" });
dotenv({ path: ".env" });

const DRY = process.argv.includes("--dry");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const { data: teams } = await sb.from("teams").select("id, nome");
  const nome = new Map((teams ?? []).map((t) => [t.id, t.nome as string]));

  const { data: mg } = await sb.from("matches").select("id, grupo, time_casa_id, time_fora_id").eq("fase", "grupos");
  const minfo = new Map((mg ?? []).map((m) => [m.id, m]));

  // usuários que têm pelo menos 1 pick de mata
  const { data: pmAll } = await sb.from("palpites_mata").select("id, user_id, time_id, fase");
  const porUser = new Map<string, { id: string; time_id: string; fase: string }[]>();
  for (const p of pmAll ?? []) {
    const arr = porUser.get(p.user_id) ?? [];
    arr.push({ id: p.id, time_id: p.time_id, fase: p.fase });
    porUser.set(p.user_id, arr);
  }

  const { data: users } = await sb.from("users").select("id, nome");
  const nomeUser = new Map((users ?? []).map((u) => [u.id, u.nome as string]));

  let totalFantasmas = 0;
  let usersAfetados = 0;
  let usersPulados = 0;
  const idsParaApagar: string[] = [];

  for (const [userId, picks] of porUser) {
    const { data: pg } = await sb.from("palpites_grupos").select("match_id, placar_casa, placar_fora").eq("user_id", userId);
    const jogos: JogoFinalizado[] = [];
    for (const p of pg ?? []) {
      const m = minfo.get(p.match_id);
      if (!m || !m.grupo || !m.time_casa_id || !m.time_fora_id) continue;
      jogos.push({ grupo: m.grupo as Grupo, time_casa_id: m.time_casa_id, time_fora_id: m.time_fora_id, placar_casa: p.placar_casa, placar_fora: p.placar_fora });
    }
    let validos = new Set<string>();
    try {
      validos = timesValidosR32(resolverBracketR32(jogos));
    } catch {
      /* ignora */
    }
    // Conservador: só processa R32 completo (32 times)
    if (validos.size !== 32) { usersPulados++; continue; }

    // Só remove fantasmas em fases COM LIMITE > 1 (8avos/quartas/semi/final),
    // que sao os que inflam a contagem e travam o bracket. "campeao" (limite
    // 1) nao trava nada — e os campeoes de demo dos fakes ficam preservados
    // (palpites sinteticos do painel do dashboard). "16avos" nao e palpitado.
    const FASES_QUE_TRAVAM = new Set(["8avos", "quartas", "semi", "final"]);
    const fantasmas = picks.filter((p) => FASES_QUE_TRAVAM.has(p.fase) && !validos.has(p.time_id));
    if (fantasmas.length) {
      usersAfetados++;
      totalFantasmas += fantasmas.length;
      console.log(`  ${nomeUser.get(userId) ?? userId}: ${fantasmas.length} fantasma(s) → ${fantasmas.map((f) => `${f.fase}:${nome.get(f.time_id) ?? f.time_id}`).join(", ")}`);
      idsParaApagar.push(...fantasmas.map((f) => f.id));
    }
  }

  console.log(`\n${DRY ? "[DRY-RUN] " : ""}Resumo:`);
  console.log(`  Usuários com fantasma: ${usersAfetados}`);
  console.log(`  Total de picks fantasma: ${totalFantasmas}`);
  console.log(`  Usuários pulados (R32 incompleto): ${usersPulados}`);

  if (!DRY && idsParaApagar.length) {
    for (let i = 0; i < idsParaApagar.length; i += 100) {
      const chunk = idsParaApagar.slice(i, i + 100);
      const { error } = await sb.from("palpites_mata").delete().in("id", chunk);
      if (error) throw error;
    }
    console.log(`  ✓ ${idsParaApagar.length} picks fantasma removidos.`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
