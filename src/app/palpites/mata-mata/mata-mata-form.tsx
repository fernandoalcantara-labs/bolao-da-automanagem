"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import type { FasePalpiteMata } from "@/types/database";
import { MICROCOPY } from "@/lib/microcopy";
import { miniConfetti, bigConfetti } from "@/lib/confetti";
import { BracketView, type Team as BracketTeam } from "./bracket-view";
import type { ParR32Resolvido } from "@/lib/bracket-2026";
import { useAutosave, lerCachePalpites } from "@/hooks/use-autosave";
import { AutosaveStatusBadge } from "@/components/palpites/autosave-status";
import { aplicarPick, ORDEM_FASES } from "@/lib/mata-mata-picks";

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

type PicksSerial = Record<FasePalpiteMata, string[]>;

export function MataMataForm({
  teams,
  palpites,
  r32,
  fechado,
  userId,
}: {
  teams: Team[];
  palpites: Palpite[];
  r32: ParR32Resolvido[];
  fechado: boolean;
  userId: string;
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
      const res = aplicarPick(prev, fase, timeId, r32);
      if (!res.ok) {
        const fasecfg = FASES.find((f) => f.key === res.fase);
        toast({
          title: `Limite atingido em ${fasecfg?.label ?? res.fase}`,
          description: `Você já tem ${res.quantidade} picks aqui. Desmarque um pra trocar.`,
          variant: "destructive",
        });
        return prev;
      }
      return res.picks;
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
      {/* Header com progresso e autosave */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProgressoFases picks={picks} />
        {!fechado && <AutosaveStatusBadge status={autosaveStatus} />}
      </div>

      <div className="space-y-2">
        {/* QW5 T2: dica de mobile atualizada — agora menciona os botões
            de zoom em vez de só "arrastar". */}
        <p className="text-xs font-medium text-muted-foreground lg:hidden">
          👉 Use os botões de zoom (canto superior direito) ou arraste pra ver o bracket. Toca num
          time pra marcar como vencedor.
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

// Lógica de adversário/pick agora vive em @/lib/mata-mata-picks (testável).
