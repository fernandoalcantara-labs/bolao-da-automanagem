"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

type Team = {
  id: string;
  nome: string;
  codigo_fifa: string;
  bandeira_url: string;
  grupo: string;
  tbd: boolean;
};

const GRUPOS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function SelecoesTable({ teams }: { teams: Team[] }) {
  const [rows, setRows] = React.useState(
    Object.fromEntries(teams.map((t) => [t.id, { ...t }])),
  );
  const [saving, setSaving] = React.useState<string | null>(null);

  function update(id: string, patch: Partial<Team>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function salvar(id: string) {
    setSaving(id);
    const t = rows[id];
    const supabase = createClient();
    const { error } = await supabase
      .from("teams")
      .update({
        nome: t.nome,
        codigo_fifa: t.codigo_fifa,
        bandeira_url: `https://flagcdn.com/w160/${t.codigo_fifa}.png`,
        grupo: t.grupo,
        tbd: false,
      })
      .eq("id", id);
    setSaving(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Seleção atualizada", variant: "success" });
    update(id, { tbd: false, bandeira_url: `https://flagcdn.com/w160/${t.codigo_fifa}.png` });
  }

  const porGrupo = new Map<string, Team[]>();
  for (const t of Object.values(rows)) {
    const arr = porGrupo.get(t.grupo) ?? [];
    arr.push(t);
    porGrupo.set(t.grupo, arr);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {GRUPOS.map((g) => {
        const times = porGrupo.get(g) ?? [];
        return (
          <Card key={g}>
            <CardContent className="space-y-2 p-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Grupo {g}</p>
              {times.map((t) => (
                <div key={t.id} className="space-y-1.5 rounded border border-border/60 p-2">
                  <div className="flex items-center gap-2">
                    {t.codigo_fifa && t.codigo_fifa !== "tbd" && (
                      <Image
                        src={`https://flagcdn.com/w80/${t.codigo_fifa}.png`}
                        alt={t.nome}
                        width={24}
                        height={18}
                        unoptimized
                        className="rounded-sm"
                      />
                    )}
                    <Input
                      value={t.nome}
                      onChange={(e) => update(t.id, { nome: e.target.value })}
                      className="h-8 text-sm"
                    />
                    {t.tbd && <Badge variant="warning">TBD</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={t.codigo_fifa}
                      onChange={(e) => update(t.id, { codigo_fifa: e.target.value.toLowerCase() })}
                      placeholder="código (ex: br)"
                      className="h-8 w-28 text-xs"
                    />
                    <Select value={t.grupo} onValueChange={(v) => update(t.id, { grupo: v })}>
                      <SelectTrigger className="h-8 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRUPOS.map((gg) => (
                          <SelectItem key={gg} value={gg}>{gg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => salvar(t.id)}
                      disabled={saving === t.id}
                    >
                      {saving === t.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
