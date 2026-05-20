"use client";

import * as React from "react";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import type { FasePalpiteMata } from "@/types/database";
import { MICROCOPY } from "@/lib/microcopy";
import { miniConfetti, bigConfetti } from "@/lib/confetti";
import { BracketView, type Team as BracketTeam } from "./bracket-view";
import type { ParR32Resolvido, EmpateTerceiros } from "@/lib/bracket-2026";
import { useAutosave, lerCachePalpites } from "@/hooks/use-autosave";
import { AutosaveStatusBadge } from "@/components/palpites/autosave-status";

type Team = {
  id: string;
  nome: string;
  codigo_fifa: string;
  bandeira_url: string;
  grupo: string;
  tbd: boolean;
};

type Palpite = { time_id: string; fase: FasePalpiteMata };

const FASES: { key: FasePalpiteMata; label: string; quantidade: number; descricao: string }[] = [
  { key: "8avos", label: "Oitavas", quantidade: 16, descricao: "16 que vencem o R32 (8 pts cada)" },
  { key: "quartas", label: "Quartas", quantidade: 8, descricao: "8 que vencem as oitavas (12 pts cada)" },
  { key: "semi", label: "Semi", quantidade: 4, descricao: "4 que vencem as quartas (16 pts cada)" },
  { key: "final", label: "Final", quantidade: 2, descricao: "2 finalistas (20 pts cada)" },
  { key: "campeao", label: "Campeão", quantidade: 1, descricao: "Campeão (40 pts) — o outro finalista é vice (24)" },
];

const ORDEM_FASES: FasePalpiteMata[] = ["16avos", "8avos", "quartas", "semi", "final", "campeao"];

type PicksSerial = Record<FasePalpiteMata, string[]>;

export function MataMataForm({
  teams,
  palpites,
  r32,
  fechado,
  userId,
  empateTerceiros,
}: {
  teams: Team[];
  palpites: Palpite[];
  r32: ParR32Resolvido[];
  fechado: boolean;
  userId: string;
  empateTerceiros?: EmpateTerceiros | null;
}) {
  const storageKey = `bolao:palpites:mata:${userId}`;

  // Estado de picks — fonte de verdade local
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
    // Reconciliacao com cache: se cache local tem mais picks que o server,
    // hidrata do cache (caso 'preenchi e dei F5').
    const cache = lerCachePalpites<PicksSerial>(storageKey);
    if (cache) {
      const cacheCount = Object.values(cache).reduce(
        (acc, arr) => acc + (arr?.length ?? 0),
        0,
      );
      const serverCount = Object.values(init).reduce(
        (acc, set) => acc + set.size,
        0,
      );
      if (cacheCount > serverCount) {
        for (const fase of ORDEM_FASES) {
          if (cache[fase]) init[fase] = new Set(cache[fase]);
        }
      }
    }
    return init;
  });

  // Versao serializavel pro hook de autosave (Set nao serializa em JSON)
  const picksSerial: PicksSerial = React.useMemo(
    () => ({
      "16avos": [...picks["16avos"]],
      "8avos": [...picks["8avos"]],
      "quartas": [...picks["quartas"]],
      "semi": [...picks["semi"]],
      "final": [...picks["final"]],
      "campeao": [...picks["campeao"]],
    }),
    [picks],
  );

  const { status: autosaveStatus, forceSave } = useAutosave({
    storageKey,
    state: picksSerial,
    enabled: !fechado,
    saveRemote: async (snapshot) => {
      const supabase = createClient();
      await supabase.from("palpites_mata").delete().eq("user_id", userId);
      const rows: { user_id: string; time_id: string; fase: FasePalpiteMata }[] = [];
      for (const fase of ORDEM_FASES) {
        for (const time_id of snapshot[fase] ?? []) {
          rows.push({ user_id: userId, time_id, fase });
        }
      }
      if (rows.length === 0) return;
      const { error } = await supabase.from("palpites_mata").insert(rows);
      if (error) throw error;
    },
  });
  const [saving, setSaving] = React.useState(false);

  // Mapa rápido id→team
  const teamMap = React.useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])) as Record<string, BracketTeam>,
    [teams],
  );

  function pickInMatch(fase: FasePalpiteMata, timeId: string) {
    if (fechado) return;
    setPicks((prev) => {
      const next = { ...prev };
      // Clone todos os sets
      for (const f of ORDEM_FASES) next[f] = new Set(prev[f]);

      const jaTem = prev[fase].has(timeId);
      if (jaTem) {
        // Toggle off: remove desta fase e de todas as posteriores
        const idx = ORDEM_FASES.indexOf(fase);
        for (let i = idx; i < ORDEM_FASES.length; i++) {
          next[ORDEM_FASES[i]].delete(timeId);
        }
        return next;
      }

      // Toggle on: respeitando limite e removendo adversário no mesmo match
      const fasecfg = FASES.find((f) => f.key === fase);
      if (fasecfg && next[fase].size >= fasecfg.quantidade) {
        // Caso especial campeao: substitui o atual
        if (fase === "campeao") {
          next[fase] = new Set([timeId]);
        } else {
          toast({
            title: `Limite atingido em ${fasecfg.label}`,
            description: `Você já tem ${fasecfg.quantidade} picks aqui. Desmarque um pra trocar.`,
            variant: "destructive",
          });
          return prev;
        }
      } else {
        next[fase].add(timeId);
      }

      // Adversário no mesmo match precisa SAIR da mesma fase e posteriores
      const adv = encontrarAdversario(fase, timeId, prev, r32);
      if (adv) {
        const idx = ORDEM_FASES.indexOf(fase);
        for (let i = idx; i < ORDEM_FASES.length; i++) {
          next[ORDEM_FASES[i]].delete(adv);
        }
      }

      // Cascata pra trás: adiciona o time em todas as fases ANTERIORES também
      // (necessário pra consistência — se chega à semi, naturalmente passou pelas oitavas)
      const idx = ORDEM_FASES.indexOf(fase);
      for (let i = 1; i < idx; i++) {
        next[ORDEM_FASES[i]].add(timeId);
      }

      return next;
    });
  }

  // Force save (botao Salvar continua existindo como fallback)
  async function salvar() {
    setSaving(true);
    try {
      await forceSave();
      toast({ ...MICROCOPY.toastMataMataSalvo, variant: "success" });
      if (picks.campeao.size === 1) bigConfetti();
      else miniConfetti();
    } catch (e: any) {
      toast({
        title: MICROCOPY.toastErroGenerico,
        description: e?.message ?? "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Banner de empate entre 3os colocados (tarefa 4 do fix-matamata) */}
      {empateTerceiros && (
        <Card className="border-2 border-festive-orange/40 bg-festive-orange/5">
          <CardContent className="flex items-start gap-3 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-festive-orange" />
            <p className="text-sm font-medium">
              ⚠️ Pelos seus palpites,{" "}
              <strong className="text-festive-orange">{empateTerceiros.quantidade}</strong>{" "}
              seleções estão empatadas em pontos/saldo/gols pró na disputa pelos 8 melhores
              terceiros. Nessa situação, a FIFA usa o ranking pré-Copa. No nosso bolão, estamos
              usando ordem alfabética para desempatar — isso pode mudar as equipes classificadas
              em terceiro.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Header com progresso e autosave */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProgressoFases picks={picks} />
        {!fechado && <AutosaveStatusBadge status={autosaveStatus} />}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground lg:hidden">
          👉 Arrasta horizontalmente pra ver todo o bracket. Toca num time pra marcar como vencedor.
        </p>
        <BracketView
          r32={r32}
          teams={teamMap}
          picks={picks}
          onPick={pickInMatch}
          fechado={fechado}
        />
      </div>

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

// ───────────────────────────────────────── Helper: progresso ─────────────────────────────────────

function ProgressoFases({ picks }: { picks: Record<FasePalpiteMata, Set<string>> }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {FASES.map((f) => {
        const total = picks[f.key].size;
        const ok = total === f.quantidade;
        return (
          <Badge key={f.key} variant={ok ? "success" : "muted"}>
            {f.label}: {total}/{f.quantidade}
          </Badge>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────── Adversário ─────────────────────────────────────────

function encontrarAdversario(
  fase: FasePalpiteMata,
  timeId: string,
  picks: Record<FasePalpiteMata, Set<string>>,
  r32: ParR32Resolvido[],
): string | null {
  if (fase === "8avos") {
    // Adversário direto vem do match do R32
    for (const par of r32) {
      const a = par.casaTime?.time_id;
      const b = par.foraTime?.time_id;
      if (a === timeId) return b ?? null;
      if (b === timeId) return a ?? null;
    }
    return null;
  }
  // Pra fases adiante, o adversário é o outro time que estava no MESMO sub-bracket
  // que o user havia picado na fase anterior. Estratégia: encontrar todos os times
  // da fase anterior que descendem do mesmo "ramo" e excluir o próprio.
  // Simplificação MVP: pega os 2 finalistas (esquerda/direita do bracket) pra "final"
  // e os outros casos não removem automaticamente — o cascade já garante consistência.
  if (fase === "campeao") {
    // Adversário do campeão = outro finalista
    const finalistas = [...picks.final];
    return finalistas.find((id) => id !== timeId) ?? null;
  }
  return null;
}
