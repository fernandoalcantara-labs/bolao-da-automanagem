"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { FasePalpiteMata } from "@/types/database";
import { MICROCOPY } from "@/lib/microcopy";
import { miniConfetti, bigConfetti } from "@/lib/confetti";

type Team = {
  id: string;
  nome: string;
  codigo_fifa: string;
  bandeira_url: string;
  grupo: string;
  tbd: boolean;
};

type Palpite = { time_id: string; fase: FasePalpiteMata };

// As 32 classificadas pra 16 avos saem automaticamente da fase de grupos —
// não palpitadas pelo usuário. A partir daí o usuário escolhe quem ganha
// cada fase, com pontos crescentes.
const FASES: { key: FasePalpiteMata; label: string; quantidade: number; descricao: string }[] = [
  { key: "8avos", label: "Oitavas", quantidade: 16, descricao: "16 seleções que vencem o R32 (8 pts cada)" },
  { key: "quartas", label: "Quartas", quantidade: 8, descricao: "8 que vencem as oitavas (12 pts cada)" },
  { key: "semi", label: "Semi", quantidade: 4, descricao: "4 que vencem as quartas (16 pts cada)" },
  { key: "final", label: "Final", quantidade: 2, descricao: "2 finalistas (20 pts cada)" },
  { key: "campeao", label: "Campeão", quantidade: 1, descricao: "Campeão (40 pts) — o outro finalista é vice (24)" },
];

export function MataMataForm({
  teams,
  palpites,
  fechado,
}: {
  teams: Team[];
  palpites: Palpite[];
  fechado: boolean;
}) {
  // Estado: para cada fase, set de time_ids
  const [picks, setPicks] = React.useState<Record<FasePalpiteMata, Set<string>>>(() => {
    const init: Record<FasePalpiteMata, Set<string>> = {
      "16avos": new Set(),
      "8avos": new Set(),
      "quartas": new Set(),
      "semi": new Set(),
      "final": new Set(),
      "campeao": new Set(),
    };
    for (const p of palpites) {
      if (init[p.fase]) init[p.fase].add(p.time_id);
    }
    return init;
  });
  const [saving, setSaving] = React.useState(false);
  const [aba, setAba] = React.useState<FasePalpiteMata>("8avos");

  function toggle(fase: FasePalpiteMata, timeId: string) {
    if (fechado) return;
    setPicks((prev) => {
      const next = { ...prev, [fase]: new Set(prev[fase]) };
      const idxAtual = FASES.findIndex((f) => f.key === fase);
      if (next[fase].has(timeId)) {
        // Removendo: cascata para frente — remove de todas as fases posteriores
        for (let i = idxAtual; i < FASES.length; i++) {
          const f = FASES[i].key;
          const s = new Set(next[f]);
          s.delete(timeId);
          next[f] = s;
        }
        return next;
      }
      // Adicionando: respeita limite da fase e adiciona em todas as anteriores
      if (next[fase].size >= FASES[idxAtual].quantidade) {
        toast({
          title: `Limite atingido`,
          description: `Você já escolheu ${FASES[idxAtual].quantidade} seleções para ${FASES[idxAtual].label}.`,
          variant: "destructive",
        });
        return prev;
      }
      next[fase] = new Set([...next[fase], timeId]);
      for (let i = idxAtual - 1; i >= 0; i--) {
        const f = FASES[i].key;
        next[f] = new Set([...next[f], timeId]);
      }
      return next;
    });
  }

  // Times disponíveis em cada aba: na 1a fase, todos; nas outras, só os marcados na fase anterior
  function timesDisponiveis(fase: FasePalpiteMata): Team[] {
    const idx = FASES.findIndex((f) => f.key === fase);
    if (idx === 0) return teams;
    const faseAnterior = FASES[idx - 1].key;
    const ids = picks[faseAnterior];
    return teams.filter((t) => ids.has(t.id));
  }

  async function salvar() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }
    // Apaga tudo do user e re-insere (mais simples e seguro)
    await supabase.from("palpites_mata").delete().eq("user_id", userId);
    const rows: { user_id: string; time_id: string; fase: FasePalpiteMata }[] = [];
    for (const f of FASES) {
      for (const time_id of picks[f.key]) {
        rows.push({ user_id: userId, time_id, fase: f.key });
      }
    }
    const { error } = await supabase.from("palpites_mata").insert(rows);
    setSaving(false);
    if (error) {
      toast({ title: MICROCOPY.toastErroGenerico, description: error.message, variant: "destructive" });
      return;
    }
    toast({ ...MICROCOPY.toastMataMataSalvo, variant: "success" });
    if (picks.campeao.size === 1) bigConfetti();
    else miniConfetti();
  }

  return (
    <div className="space-y-4">
      <Tabs value={aba} onValueChange={(v) => setAba(v as FasePalpiteMata)}>
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/40 p-1">
          {FASES.map((f) => {
            const total = picks[f.key].size;
            const ok = total === f.quantidade;
            return (
              <TabsTrigger key={f.key} value={f.key} className="gap-2">
                {f.label}
                <Badge variant={ok ? "success" : "muted"}>
                  {total}/{f.quantidade}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {FASES.map((f) => {
          const disponiveis = timesDisponiveis(f.key);
          const idx = FASES.findIndex((x) => x.key === f.key);
          return (
            <TabsContent key={f.key} value={f.key} className="space-y-3">
              <div className="rounded-md border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
                {f.descricao} · {disponiveis.length === teams.length
                  ? "Escolha entre todas as seleções"
                  : `Apenas times escolhidos em "${FASES[idx - 1].label}" aparecem aqui`}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {disponiveis.map((t) => {
                  const picked = picks[f.key].has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={fechado}
                      onClick={() => toggle(f.key, t.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-left transition-all hover:border-primary/40",
                        picked && "border-primary bg-primary/15 shadow shadow-primary/20",
                        t.tbd && "opacity-75",
                      )}
                    >
                      <Image
                        src={t.bandeira_url}
                        alt={t.nome}
                        width={24}
                        height={18}
                        className="rounded-sm shadow"
                        unoptimized
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="line-clamp-1 text-sm font-medium">{t.nome}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Grupo {t.grupo}
                        </p>
                      </div>
                      {picked && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {!fechado && (
        <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
          <Button onClick={salvar} disabled={saving} size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {MICROCOPY.salvarMataMata}
          </Button>
        </div>
      )}
    </div>
  );
}
