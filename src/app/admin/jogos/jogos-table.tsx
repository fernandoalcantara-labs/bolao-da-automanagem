"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { formatarDataJogo } from "@/lib/datetime";
import { triggerRecalcDebounced } from "@/lib/recalc-trigger";

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
          manual: m.editado_manualmente,
        },
      ]),
    ),
  );
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [revertingId, setRevertingId] = React.useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = React.useState<string | null>(null);
  const [soManuais, setSoManuais] = React.useState(false);

  async function reverterAutomatico(m: Match) {
    setRevertingId(m.id);
    const supabase = createClient();
    // "Auto" volta o jogo pro estado VAZIO (agendado, sem placar) e
    // remove o flag manual. Próxima sync com a API vai trazer o resultado
    // oficial. Antes só setávamos editado_manualmente=false, mas isso
    // deixava placar+status congelados até o sync passar — confuso pro
    // admin, que esperava ver o jogo "limpo".
    const { error } = await supabase
      .from("matches")
      .update({
        editado_manualmente: false,
        status: "agendado",
        placar_casa: null,
        placar_fora: null,
      })
      .eq("id", m.id);
    setRevertingId(null);
    setConfirmRevertId(null);
    if (error) {
      toast({ title: "Erro ao reverter", description: error.message, variant: "destructive" });
      return;
    }
    setRows((r) => ({
      ...r,
      [m.id]: { c: "", f: "", s: "agendado", manual: false },
    }));
    toast({
      title: "Jogo voltou pro automático ✓",
      description: "Recalculando pontuações… próxima sync vai puxar o resultado oficial.",
      variant: "success",
    });
    // Pontuações precisam ser recalculadas: o placar manual pode ter
    // mudado o que cada usuário ganhou. Debounced pra agrupar com outras
    // edições caso o admin esteja batendo vários jogos em sequência.
    triggerRecalcDebounced();
  }

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
    // Marca como manual no state local pro botão "Auto" aparecer sem F5
    setRows((rr) => ({ ...rr, [m.id]: { ...rr[m.id], manual: true } }));
    toast({
      title: "Jogo atualizado",
      description: "Recalculando pontuações…",
      variant: "success",
    });
    // IMPORTANTE: sempre que mexer em matches (placar/status), o recalc
    // tem que rodar. Sem isso pontos antigos ficam congelados — e em
    // particular palpites de jogos que voltaram pra "agendado" não zeram.
    triggerRecalcDebounced();
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
    <Tabs defaultValue="grupos" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="flex flex-wrap gap-1 bg-muted/40 p-1">
          {fases.map((f) => (
            <TabsTrigger key={f.key} value={f.key}>{f.label}</TabsTrigger>
          ))}
        </TabsList>
        <label className="inline-flex items-center gap-2 text-xs font-bold">
          <Switch checked={soManuais} onCheckedChange={setSoManuais} />
          Só editados manualmente
        </label>
      </div>

      {fases.map((f) => {
        let jogosDaFase = matches.filter((m) => m.fase === f.key);
        if (soManuais) {
          jogosDaFase = jogosDaFase.filter((m) => rows[m.id]?.manual);
        }
        return (
          <TabsContent key={f.key} value={f.key} className="space-y-2">
            {jogosDaFase.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {soManuais
                  ? "Nenhum jogo editado manualmente nesta fase."
                  : "Nenhum jogo nesta fase ainda."}
              </p>
            )}
            {jogosDaFase.map((m) => {
              const casa = m.time_casa_id ? teamMap.get(m.time_casa_id) : null;
              const fora = m.time_fora_id ? teamMap.get(m.time_fora_id) : null;
              const r = rows[m.id];
              return (
                <Card key={m.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="flex w-32 flex-col gap-1 text-xs text-muted-foreground">
                      <Badge variant="muted" className="w-fit">{m.grupo ?? m.fase}</Badge>
                      <span className="font-medium leading-tight">{formatarDataJogo(m.data_hora, "curto")}</span>
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
                    {r.manual && (
                      <>
                        <Badge variant="warning">✏️ Manual</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Voltar pro modo automático (próximo sync vai atualizar pela API)"
                          onClick={() => setConfirmRevertId(m.id)}
                          disabled={revertingId === m.id}
                        >
                          {revertingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Auto
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </CardContent>
                  {confirmRevertId === m.id && (
                    <div className="border-t-2 border-festive-orange/40 bg-festive-orange/10 p-3 text-sm">
                      <div className="mb-2 flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-festive-orange" />
                        <div className="flex-1 space-y-1">
                          <p className="font-extrabold text-festive-orange">
                            Voltar pra modo automático?
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Resultado manual atual:{" "}
                            <strong className="text-foreground">
                              {casa?.nome ?? "—"} {r.c || "?"}×{r.f || "?"} {fora?.nome ?? "—"}
                            </strong>
                            . Ao confirmar, o jogo volta pro estado{" "}
                            <strong className="text-foreground">agendado</strong> sem placar.
                            A próxima sincronização com a API puxa o resultado oficial.
                            Sua edição manual será perdida.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setConfirmRevertId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => reverterAutomatico(m)}>
                          Confirmar reversão
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
