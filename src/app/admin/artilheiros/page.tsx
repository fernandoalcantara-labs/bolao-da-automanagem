import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { ArtilheirosValidacao } from "./validacao";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminArtilheirosPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: palpites }, { data: players }, { data: users }] = await Promise.all([
    supabase
      .from("palpites_artilheiro")
      .select("id, user_id, player_id, player_nome_manual, acertou"),
    supabase.from("players").select("id, nome, gols_torneio"),
    supabase.from("users").select("id, nome, nome_exibicao"),
  ]);

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]));
  // nome_exibicao com fallback pra nome completo — admin precisa identificar
  const userMap = new Map(
    (users ?? []).map((u: any) => [u.id, (u.nome_exibicao as string) ?? u.nome]),
  );

  type PalpiteItem = { id: string; user_id: string; user_nome: string; acertou: boolean | null };
  type Grupo = {
    chave: string;
    label: string;
    manual: boolean;
    gols: number;
    palpites: PalpiteItem[];
  };
  const grupos = new Map<string, Grupo>();

  for (const p of (palpites ?? []) as any[]) {
    const player = p.player_id ? playerMap.get(p.player_id) : null;
    const chave = p.player_id
      ? `id:${p.player_id}`
      : `m:${(p.player_nome_manual ?? "").toLowerCase()}`;
    const label = player ? player.nome : (p.player_nome_manual as string) ?? "—";
    const manual = !p.player_id;
    const grupo: Grupo = grupos.get(chave) ?? {
      chave,
      label,
      manual,
      gols: player?.gols_torneio ?? 0,
      palpites: [],
    };
    grupo.palpites.push({
      id: p.id,
      user_id: p.user_id,
      user_nome: userMap.get(p.user_id) ?? "—",
      acertou: p.acertou,
    });
    grupos.set(chave, grupo);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Validar palpites de artilheiro</CardTitle>
          <CardDescription>
            Quando a Copa terminar, marque o(s) palpite(s) correto(s). Os pontos do bolão são
            recalculados automaticamente.
          </CardDescription>
        </CardHeader>
      </Card>

      <ArtilheirosValidacao grupos={[...grupos.values()]} />
    </div>
  );
}
