"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save, Trophy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  nome: string;
  time_nome: string;
  bandeira_url: string;
  gols_torneio: number;
};

export function ArtilheiroForm({
  players,
  atual,
  fechado,
}: {
  players: Player[];
  atual: string | null;
  fechado: boolean;
}) {
  const [selected, setSelected] = React.useState<string | null>(atual);
  const [busca, setBusca] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) => p.nome.toLowerCase().includes(q) || p.time_nome.toLowerCase().includes(q),
    );
  }, [busca, players]);

  async function salvar() {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("palpites_artilheiro")
      .upsert({ user_id: userData.user.id, player_id: selected }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Artilheiro salvo!", variant: "success" });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar jogador ou seleção…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={fechado}
            onClick={() => setSelected(p.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40",
              selected === p.id && "border-primary bg-primary/10 shadow-md shadow-primary/20",
            )}
          >
            {p.bandeira_url && (
              <Image
                src={p.bandeira_url}
                alt={p.time_nome}
                width={28}
                height={20}
                className="rounded-sm shadow"
                unoptimized
              />
            )}
            <div className="flex-1 overflow-hidden">
              <p className="line-clamp-1 text-sm font-medium">{p.nome}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">{p.time_nome}</p>
            </div>
            {p.gols_torneio > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                <Trophy className="h-3 w-3" /> {p.gols_torneio}
              </span>
            )}
          </button>
        ))}
      </div>

      {!fechado && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button onClick={salvar} disabled={!selected || saving} size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar artilheiro
          </Button>
        </div>
      )}
    </div>
  );
}
