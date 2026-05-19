"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save, LayoutGrid, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { formatarDataJogo } from "@/lib/datetime";
import { MICROCOPY } from "@/lib/microcopy";
import { miniConfetti } from "@/lib/confetti";
import { useAutosave, lerCachePalpites } from "@/hooks/use-autosave";
import { AutosaveStatusBadge } from "@/components/palpites/autosave-status";

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
  userId: string;
};

type Modo = "grupo" | "rodada";
type FormState = Record<string, { c: string; f: string }>;

export function PalpitesGruposForm({ matches, teams, palpites, fechado, userId }: Props) {
  const storageKey = `bolao:palpites:grupos:${userId}`;

  const [state, setState] = React.useState<FormState>(() => {
    // 1. Default = palpites do servidor
    const init: FormState = {};
    for (const m of matches) {
      const p = palpites[m.id];
      init[m.id] = { c: p ? String(p.placar_casa) : "", f: p ? String(p.placar_fora) : "" };
    }
    // 2. Reconciliacao com cache local: se cache tem MAIS palpites
    //    preenchidos, usa cache (user preencheu mas nao salvou antes do F5).
    //    Caso contrario, server e' a fonte de verdade.
    const cache = lerCachePalpites<FormState>(storageKey);
    if (cache) {
      const cacheCount = Object.values(cache).filter(
        (v) => v && (v.c !== "" || v.f !== ""),
      ).length;
      const serverCount = Object.values(init).filter(
        (v) => v.c !== "" || v.f !== "",
      ).length;
      if (cacheCount > serverCount) {
        // Merge: mantem todos os match_ids do server + sobrepoe valores do cache
        for (const matchId in init) {
          if (cache[matchId]) init[matchId] = cache[matchId];
        }
      }
    }
    return init;
  });
  const [saving, setSaving] = React.useState(false);
  const [modo, setModo] = React.useState<Modo>("grupo");

  // Autosave: localStorage imediato + Supabase com debounce de 800ms
  const { status: autosaveStatus, forceSave } = useAutosave({
    storageKey,
    state,
    enabled: !fechado,
    saveRemote: async (snapshot) => {
      const supabase = createClient();
      const rows = Object.entries(snapshot)
        .filter(([, v]) => v.c !== "" && v.f !== "")
        .map(([match_id, v]) => ({
          match_id,
          user_id: userId,
          placar_casa: Number(v.c),
          placar_fora: Number(v.f),
        }));
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("palpites_grupos")
        .upsert(rows, { onConflict: "user_id,match_id" });
      if (error) throw error;
    },
  });

  // Carrega/persiste o modo no localStorage
  React.useEffect(() => {
    const saved = window.localStorage.getItem("palpites-grupos-modo");
    if (saved === "rodada" || saved === "grupo") setModo(saved);
  }, []);
  function changeModo(m: Modo) {
    setModo(m);
    window.localStorage.setItem("palpites-grupos-modo", m);
  }

  function update(id: string, side: "c" | "f", value: string) {
    if (!/^\d{0,2}$/.test(value)) return;
    setState((s) => ({ ...s, [id]: { ...s[id], [side]: value } }));
  }

  // Força salvar agora (botão "Salvar" continua existindo como fallback caso
  // o autosave esteja em "error"/"offline" e o user queira confirmar)
  async function salvar() {
    setSaving(true);
    try {
      await forceSave();
      const total = Object.values(state).filter(
        (v) => v.c !== "" && v.f !== "",
      ).length;
      const t = MICROCOPY.toastPalpitesSalvos(total);
      toast({ ...t, variant: "success" });
      miniConfetti();
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

  const totalPalpitados = Object.values(state).filter((v) => v.c !== "" && v.f !== "").length;

  return (
    <div className="space-y-4">
      {/* Toggle de modo + progresso */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5">
          <button
            onClick={() => changeModo("grupo")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              modo === "grupo"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Por grupo
          </button>
          <button
            onClick={() => changeModo("rodada")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
              modo === "rodada"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListOrdered className="h-3.5 w-3.5" /> Por rodada
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalPalpitados}/72</strong> jogos palpitados
          </span>
          {!fechado && <AutosaveStatusBadge status={autosaveStatus} />}
        </div>
      </div>

      {modo === "grupo" ? (
        <PorGrupo
          matches={matches}
          teams={teams}
          state={state}
          update={update}
          fechado={fechado}
        />
      ) : (
        <PorRodada
          matches={matches}
          teams={teams}
          state={state}
          update={update}
          fechado={fechado}
        />
      )}

      {!fechado && (
        <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
          <Button onClick={salvar} disabled={saving} size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {MICROCOPY.salvarPalpites}
          </Button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────── Por grupo ─────────────────────────────────────────

function PorGrupo({
  matches, teams, state, update, fechado,
}: {
  matches: Match[];
  teams: Record<string, Team>;
  state: Record<string, { c: string; f: string }>;
  update: (id: string, side: "c" | "f", value: string) => void;
  fechado: boolean;
}) {
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {porGrupo.map(([grupo, jogos]) => {
        const times = Object.values(teams).filter((t) => t.grupo === grupo);
        const palpitadosNoGrupo = jogos.filter(
          (j) => state[j.id]?.c !== "" && state[j.id]?.f !== "",
        ).length;
        return (
          <Card key={grupo} className="overflow-hidden">
            <CardContent className="space-y-3 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="text-sm">Grupo {grupo}</Badge>
                  <div className="flex -space-x-1">
                    {times.map((t) => (
                      <Image
                        key={t.id}
                        src={t.bandeira_url}
                        alt={t.nome}
                        width={20}
                        height={14}
                        title={t.nome}
                        unoptimized
                        className="rounded-sm border border-background"
                      />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {palpitadosNoGrupo}/6 palpites
                </span>
              </div>

              <div className="space-y-1.5">
                {jogos
                  .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
                  .map((m) => {
                    const casa = teams[m.time_casa_id];
                    const fora = teams[m.time_fora_id];
                    if (!casa || !fora) return null;
                    const v = state[m.id];
                    const dis = fechado || m.status !== "agendado";
                    return (
                      <div
                        key={m.id}
                        className="rounded border border-border/40 bg-card/30 p-2"
                      >
                        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                          <Badge variant="muted" className="text-[10px]">R{m.rodada}</Badge>
                          <span>{formatarDataJogo(m.data_hora, "curto")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-1 items-center justify-end gap-1.5 text-right text-xs">
                            <span className="team-name font-medium">{casa.nome}</span>
                            <Image src={casa.bandeira_url} alt={casa.nome} width={20} height={14} unoptimized className="rounded-sm" />
                          </div>
                          <input
                            inputMode="numeric"
                            className={cn(
                              "h-11 w-11 shrink-0 rounded-xl border-2 bg-white px-0 text-center font-fredoka text-lg font-extrabold tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-festive-green/30 disabled:cursor-not-allowed disabled:opacity-50",
                              v?.c ? "border-festive-green" : "border-dashed border-festive-green/40",
                            )}
                            value={v?.c ?? ""}
                            onChange={(e) => update(m.id, "c", e.target.value)}
                            disabled={dis}
                            aria-label={`Placar de ${casa.nome}`}
                          />
                          <span className="font-bold text-muted-foreground">×</span>
                          <input
                            inputMode="numeric"
                            className={cn(
                              "h-11 w-11 shrink-0 rounded-xl border-2 bg-white px-0 text-center font-fredoka text-lg font-extrabold tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-festive-green/30 disabled:cursor-not-allowed disabled:opacity-50",
                              v?.f ? "border-festive-green" : "border-dashed border-festive-green/40",
                            )}
                            value={v?.f ?? ""}
                            onChange={(e) => update(m.id, "f", e.target.value)}
                            disabled={dis}
                            aria-label={`Placar de ${fora.nome}`}
                          />
                          <div className="flex flex-1 items-center gap-1.5 text-xs">
                            <Image src={fora.bandeira_url} alt={fora.nome} width={20} height={14} unoptimized className="rounded-sm" />
                            <span className="team-name font-medium">{fora.nome}</span>
                          </div>
                        </div>
                        {m.status === "finalizado" && (
                          <p className="mt-1 text-center text-[10px] text-emerald-400">
                            Resultado: {m.placar_casa}-{m.placar_fora}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────── Por rodada ─────────────────────────────────────────

function PorRodada({
  matches, teams, state, update, fechado,
}: {
  matches: Match[];
  teams: Record<string, Team>;
  state: Record<string, { c: string; f: string }>;
  update: (id: string, side: "c" | "f", value: string) => void;
  fechado: boolean;
}) {
  const porRodada = React.useMemo(() => {
    const m = new Map<number, Match[]>();
    for (const match of matches) {
      const arr = m.get(match.rodada) ?? [];
      arr.push(match);
      m.set(match.rodada, arr);
    }
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [matches]);

  return (
    <div className="space-y-4">
      {porRodada.map(([rodada, jogos]) => (
        <section key={rodada} className="space-y-2">
          <h2 className="text-lg font-semibold">Rodada {rodada}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {jogos.map((m) => {
              const casa = teams[m.time_casa_id];
              const fora = teams[m.time_fora_id];
              if (!casa || !fora) return null;
              const v = state[m.id];
              const dis = fechado || m.status !== "agendado";
              return (
                <Card key={m.id} className="overflow-hidden">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex w-16 flex-col text-[10px] text-muted-foreground">
                      <Badge variant="muted" className="text-[10px]">{m.grupo}</Badge>
                      <span className="mt-1">{formatarDataJogo(m.data_hora, "curto")}</span>
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-1.5 text-right">
                      <span className="team-name text-sm font-medium">{casa.nome}</span>
                      <Image src={casa.bandeira_url} alt={casa.nome} width={24} height={18} unoptimized className="rounded-sm" />
                    </div>
                    <input
                      inputMode="numeric"
                      className={cn(
                        "h-11 w-11 shrink-0 rounded-xl border-2 bg-white px-0 text-center font-fredoka text-lg font-extrabold tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-festive-green/30 disabled:cursor-not-allowed disabled:opacity-50",
                        v?.c ? "border-festive-green" : "border-dashed border-festive-green/40",
                      )}
                      value={v?.c ?? ""}
                      onChange={(e) => update(m.id, "c", e.target.value)}
                      disabled={dis}
                      aria-label={`Placar de ${casa.nome}`}
                    />
                    <span className="font-bold text-muted-foreground">×</span>
                    <input
                      inputMode="numeric"
                      className={cn(
                        "h-11 w-11 shrink-0 rounded-xl border-2 bg-white px-0 text-center font-fredoka text-lg font-extrabold tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-festive-green/30 disabled:cursor-not-allowed disabled:opacity-50",
                        v?.f ? "border-festive-green" : "border-dashed border-festive-green/40",
                      )}
                      value={v?.f ?? ""}
                      onChange={(e) => update(m.id, "f", e.target.value)}
                      disabled={dis}
                      aria-label={`Placar de ${fora.nome}`}
                    />
                    <div className="flex flex-1 items-center gap-1.5">
                      <Image src={fora.bandeira_url} alt={fora.nome} width={24} height={18} unoptimized className="rounded-sm" />
                      <span className="team-name text-sm font-medium">{fora.nome}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
