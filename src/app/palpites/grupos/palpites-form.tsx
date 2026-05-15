"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/utils";

type Team = { id: string; nome: string; codigo_fifa: string; bandeira_url: string; grupo: string };
type Match = {
  id: string;
  fase: string;
  rodada: number;
  grupo: string;
  time_casa_id: string;
  time_fora_id: string;
  data_hora: string;
  status: "agendado" | "andamento" | "finalizado";
  placar_casa: number | null;
  placar_fora: number | null;
};
type Palpite = { match_id: string; placar_casa: number; placar_fora: number };

type Props = {
  matches: Match[];
  teams: Record<string, Team>;
  palpites: Record<string, Palpite>;
  fechado: boolean;
};

export function PalpitesGruposForm({ matches, teams, palpites, fechado }: Props) {
  const [state, setState] = React.useState<Record<string, { c: string; f: string }>>(() => {
    const init: Record<string, { c: string; f: string }> = {};
    for (const m of matches) {
      const p = palpites[m.id];
      init[m.id] = {
        c: p ? String(p.placar_casa) : "",
        f: p ? String(p.placar_fora) : "",
      };
    }
    return init;
  });
  const [saving, setSaving] = React.useState(false);

  function update(id: string, side: "c" | "f", value: string) {
    if (!/^\d{0,2}$/.test(value)) return;
    setState((s) => ({ ...s, [id]: { ...s[id], [side]: value } }));
  }

  async function salvar() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      toast({ title: "Sessão expirada", variant: "destructive" });
      return;
    }
    const rows = Object.entries(state)
      .filter(([, v]) => v.c !== "" && v.f !== "")
      .map(([match_id, v]) => ({
        match_id,
        user_id: userId,
        placar_casa: Number(v.c),
        placar_fora: Number(v.f),
      }));

    const { error } = await supabase
      .from("palpites_grupos")
      .upsert(rows, { onConflict: "user_id,match_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Palpites salvos!",
      description: `${rows.length} palpite(s) atualizado(s).`,
      variant: "success",
    });
  }

  const porGrupo = React.useMemo(() => {
    const m = new Map<string, Match[]>();
    for (const match of matches) {
      const arr = m.get(match.grupo) ?? [];
      arr.push(match);
      m.set(match.grupo, arr);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue={porGrupo[0]?.[0] ?? "A"}>
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/40 p-1">
          {porGrupo.map(([grupo]) => (
            <TabsTrigger key={grupo} value={grupo} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Grupo {grupo}
            </TabsTrigger>
          ))}
        </TabsList>

        {porGrupo.map(([grupo, jogos]) => (
          <TabsContent key={grupo} value={grupo} className="space-y-3">
            {jogos.map((m) => {
              const casa = teams[m.time_casa_id];
              const fora = teams[m.time_fora_id];
              if (!casa || !fora) return null;
              const v = state[m.id];
              return (
                <Card key={m.id} className="overflow-hidden">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex w-24 flex-col text-xs text-muted-foreground">
                      <Badge variant="muted" className="w-fit">R{m.rodada}</Badge>
                      <span className="mt-1">{formatDateTime(m.data_hora)}</span>
                    </div>

                    <div className="flex flex-1 items-center justify-end gap-2 text-right">
                      <span className="line-clamp-1 text-sm font-medium">{casa.nome}</span>
                      <Image
                        src={casa.bandeira_url}
                        alt={casa.nome}
                        width={28}
                        height={20}
                        className="rounded-sm shadow"
                        unoptimized
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Input
                        inputMode="numeric"
                        className="h-10 w-12 text-center text-base font-semibold"
                        value={v?.c ?? ""}
                        onChange={(e) => update(m.id, "c", e.target.value)}
                        disabled={fechado || m.status !== "agendado"}
                      />
                      <span className="text-muted-foreground">×</span>
                      <Input
                        inputMode="numeric"
                        className="h-10 w-12 text-center text-base font-semibold"
                        value={v?.f ?? ""}
                        onChange={(e) => update(m.id, "f", e.target.value)}
                        disabled={fechado || m.status !== "agendado"}
                      />
                    </div>

                    <div className="flex flex-1 items-center gap-2">
                      <Image
                        src={fora.bandeira_url}
                        alt={fora.nome}
                        width={28}
                        height={20}
                        className="rounded-sm shadow"
                        unoptimized
                      />
                      <span className="line-clamp-1 text-sm font-medium">{fora.nome}</span>
                    </div>

                    {m.status === "finalizado" && (
                      <Badge variant="success" className="hidden sm:inline-flex">
                        {m.placar_casa} - {m.placar_fora}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {!fechado && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button onClick={salvar} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar palpites
          </Button>
        </div>
      )}
    </div>
  );
}
