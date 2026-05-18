"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save, ChevronRight, LayoutGrid, List } from "lucide-react";
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
import { BracketView, type Team as BracketTeam } from "./bracket-view";
import type { ParR32Resolvido } from "@/lib/bracket-2026";

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

export function MataMataForm({
  teams,
  palpites,
  r32,
  fechado,
}: {
  teams: Team[];
  palpites: Palpite[];
  r32: ParR32Resolvido[];
  fechado: boolean;
}) {
  // Estado de picks
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
  const [modo, setModo] = React.useState<"bracket" | "lista">("bracket");

  React.useEffect(() => {
    const saved = window.localStorage.getItem("mata-mata-modo");
    if (saved === "bracket" || saved === "lista") setModo(saved);
  }, []);
  function changeModo(m: "bracket" | "lista") {
    setModo(m);
    window.localStorage.setItem("mata-mata-modo", m);
  }

  // Mapa rápido id→team
  const teamMap = React.useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])) as Record<string, BracketTeam>,
    [teams],
  );

  // Pareamentos por fase — pra saber qual é o "adversário" de cada time num match
  // Pareamento R16 (oitavas → quartas): cada par de 2 R32 matches dá 1 R16 match
  const adversarioPorFase = React.useMemo(() => {
    const map: Record<FasePalpiteMata, Map<string, string>> = {
      "16avos": new Map(),
      "8avos": new Map(),
      "quartas": new Map(),
      "semi": new Map(),
      "final": new Map(),
      "campeao": new Map(),
    };

    // R32: cada par tem 2 times — adversários diretos
    for (const par of r32) {
      const a = par.casaTime?.time_id;
      const b = par.foraTime?.time_id;
      if (a && b) {
        map["8avos"].set(a, b);
        map["8avos"].set(b, a);
      }
    }
    // Para fases seguintes (quartas, semi, final, campeao), o adversário só é
    // conhecido quando o usuário fez seus picks. Como o usuário pode trocar de
    // ideia, calculamos dinamicamente via picks atuais. Mantemos vazio aqui.
    return map;
  }, [r32]);

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

  async function salvar() {
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaving(false);
      return;
    }
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
      {/* Toggle modo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5">
          <button
            onClick={() => changeModo("bracket")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors",
              modo === "bracket"
                ? "bg-festive-green text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Bracket
            <span className="hidden sm:inline opacity-70">(desktop)</span>
          </button>
          <button
            onClick={() => changeModo("lista")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-bold transition-colors",
              modo === "lista"
                ? "bg-festive-green text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" /> Por fase
          </button>
        </div>
        <ProgressoFases picks={picks} />
      </div>

      {modo === "bracket" ? (
        <>
          {/* Desktop ≥ lg: BracketView completo */}
          <div className="hidden lg:block">
            <BracketView
              r32={r32}
              teams={teamMap}
              picks={picks}
              onPick={pickInMatch}
              fechado={fechado}
            />
          </div>
          {/* Mobile/tablet: aviso + fallback automático pra "Por fase" */}
          <div className="lg:hidden">
            <Card>
              <CardContent className="space-y-2 p-4 text-center text-sm">
                <p>📱 O bracket completo precisa de tela larga.</p>
                <p className="text-xs text-muted-foreground">
                  Em telas pequenas, use o modo <strong>&quot;Por fase&quot;</strong> abaixo —
                  mais legível e funcional.
                </p>
                <Button onClick={() => changeModo("lista")} variant="outline" size="sm">
                  Mudar pra &quot;Por fase&quot;
                </Button>
              </CardContent>
            </Card>
            <ListaPorFase
              teams={teams}
              picks={picks}
              pickInMatch={pickInMatch}
              aba={aba}
              setAba={setAba}
              fechado={fechado}
            />
          </div>
        </>
      ) : (
        <ListaPorFase
          teams={teams}
          picks={picks}
          pickInMatch={pickInMatch}
          aba={aba}
          setAba={setAba}
          fechado={fechado}
        />
      )}

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

// ───────────────────────────────────────── Lista por fase (fallback / mobile) ────────────────────

function ListaPorFase({
  teams,
  picks,
  pickInMatch,
  aba,
  setAba,
  fechado,
}: {
  teams: Team[];
  picks: Record<FasePalpiteMata, Set<string>>;
  pickInMatch: (fase: FasePalpiteMata, timeId: string) => void;
  aba: FasePalpiteMata;
  setAba: (v: FasePalpiteMata) => void;
  fechado: boolean;
}) {
  function timesDisponiveis(fase: FasePalpiteMata): Team[] {
    const idx = FASES.findIndex((f) => f.key === fase);
    if (idx === 0) return teams; // 8avos: todos
    const faseAnterior = FASES[idx - 1].key;
    const ids = picks[faseAnterior];
    return teams.filter((t) => ids.has(t.id));
  }

  return (
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
            <div className="rounded-md border-2 border-dashed border-border bg-card/40 p-3 text-xs font-medium text-muted-foreground">
              {f.descricao} ·{" "}
              {disponiveis.length === teams.length
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
                    onClick={() => pickInMatch(f.key, t.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border-2 border-border bg-white p-2.5 text-left transition-all hover:border-festive-green/40",
                      picked && "border-festive-green bg-festive-green/10 shadow-stack-green",
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
                      <p className="line-clamp-1 text-sm font-extrabold">{t.nome}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Grupo {t.grupo}
                      </p>
                    </div>
                    {picked && <ChevronRight className="h-3.5 w-3.5 text-festive-green" />}
                  </button>
                );
              })}
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
