"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/utils";

type Team = { id: string; nome: string; bandeira_url: string; grupo: string };
type Match = {
  id: string;
  fase: string;
  rodada: number | null;
  grupo: string | null;
  time_casa_id: string | null;
  time_fora_id: string | null;
  data_hora: string;
  status: "agendado" | "andamento" | "finalizado";
  placar_casa: number | null;
  placar_fora: number | null;
  editado_manualmente: boolean;
};

export function JogosTable({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const [rows, setRows] = React.useState(() =>
    Object.fromEntries(
      matches.map((m) => [
        m.id,
        {
          c: m.placar_casa?.toString() ?? "",
          f: m.placar_fora?.toString() ?? "",
          s: m.status,
        },
      ]),
    ),
  );
  const [savingId, setSavingId] = React.useState<string | null>(null);

  function update(id: string, patch: Partial<{ c: string; f: string; s: Match["status"] }>) {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function salvar(m: Match) {
    setSavingId(m.id);
    const r = rows[m.id];
    const supabase = createClient();
    const { error } = await supabase
      .from("matches")
      .update({
        status: r.s,
        placar_casa: r.c === "" ? null : Number(r.c),
        placar_fora: r.f === "" ? null : Number(r.f),
        editado_manualmente: true,
      })
      .eq("id", m.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Jogo atualizado", variant: "success" });
  }

  const fases = [
    { key: "grupos", label: "Grupos" },
    { key: "16avos", label: "16 avos" },
    { key: "8avos", label: "Oitavas" },
    { key: "quartas", label: "Quartas" },
    { key: "semi", label: "Semi" },
    { key: "3lugar", label: "3º lugar" },
    { key: "final", label: "Final" },
  ];

  return (
    <Tabs defaultValue="grupos">
      <TabsList className="flex flex-wrap gap-1 bg-muted/40 p-1">
        {fases.map((f) => (
          <TabsTrigger key={f.key} value={f.key}>{f.label}</TabsTrigger>
        ))}
      </TabsList>

      {fases.map((f) => {
        const jogosDaFase = matches.filter((m) => m.fase === f.key);
        return (
          <TabsContent key={f.key} value={f.key} className="space-y-2">
            {jogosDaFase.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum jogo nesta fase ainda.</p>
            )}
            {jogosDaFase.map((m) => {
              const casa = m.time_casa_id ? teamMap.get(m.time_casa_id) : null;
              const fora = m.time_fora_id ? teamMap.get(m.time_fora_id) : null;
              const r = rows[m.id];
              return (
                <Card key={m.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="w-32 text-xs text-muted-foreground">
                      <Badge variant="muted">{m.grupo ?? m.fase}</Badge>
                      <p className="mt-1">{formatDateTime(m.data_hora)}</p>
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-2 text-right">
                      <span className="text-sm">{casa?.nome ?? "—"}</span>
                      {casa && (
                        <Image src={casa.bandeira_url} alt={casa.nome} width={24} height={18} unoptimized className="rounded-sm" />
                      )}
                    </div>
                    <Input
                      className="h-9 w-12 text-center"
                      value={r.c}
                      onChange={(e) => /^\d{0,2}$/.test(e.target.value) && update(m.id, { c: e.target.value })}
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      className="h-9 w-12 text-center"
                      value={r.f}
                      onChange={(e) => /^\d{0,2}$/.test(e.target.value) && update(m.id, { f: e.target.value })}
                    />
                    <div className="flex flex-1 items-center gap-2">
                      {fora && (
                        <Image src={fora.bandeira_url} alt={fora.nome} width={24} height={18} unoptimized className="rounded-sm" />
                      )}
                      <span className="text-sm">{fora?.nome ?? "—"}</span>
                    </div>
                    <Select value={r.s} onValueChange={(v) => update(m.id, { s: v as Match["status"] })}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="andamento">Em andamento</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => salvar(m)} disabled={savingId === m.id}>
                      {savingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </Button>
                    {m.editado_manualmente && <Badge variant="warning">Manual</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
