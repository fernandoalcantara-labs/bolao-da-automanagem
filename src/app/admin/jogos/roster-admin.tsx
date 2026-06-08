"use client";

import * as React from "react";
import Image from "next/image";
import { Lock, RotateCcw, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { triggerRecalcDebounced } from "@/lib/recalc-trigger";
import { toggleTimeNaFase, recalcularAutomatico16avos } from "./mata-roster-actions";
import type { RosterUIPayload } from "@/lib/mata-roster";
import type { FasePalpiteMata } from "@/types/database";

const FASES: { key: FasePalpiteMata; label: string; alvo: number }[] = [
  { key: "16avos", label: "16 Avos", alvo: 32 },
  { key: "8avos", label: "Oitavas", alvo: 16 },
  { key: "quartas", label: "Quartas", alvo: 8 },
  { key: "semi", label: "Semi", alvo: 4 },
  { key: "final", label: "Final", alvo: 2 },
  { key: "campeao", label: "Campeão", alvo: 1 },
];
const ORDEM: FasePalpiteMata[] = FASES.map((f) => f.key);

export function RosterAdmin({ payload }: { payload: RosterUIPayload }) {
  const router = useRouter();
  const [fase, setFase] = React.useState<FasePalpiteMata>("16avos");
  const [mostrarTodos, setMostrarTodos] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);

  // Estado LOCAL otimista do efetivo por fase (move o card na hora).
  const [efetivo, setEfetivo] = React.useState<Record<FasePalpiteMata, Set<string>>>(() => {
    const o = {} as Record<FasePalpiteMata, Set<string>>;
    for (const f of ORDEM) o[f] = new Set(payload.porFase[f] ?? []);
    return o;
  });

  // Reconcilia com o servidor quando o router.refresh traz novo payload
  // (cuida da cascata calculada server-side).
  React.useEffect(() => {
    const o = {} as Record<FasePalpiteMata, Set<string>>;
    for (const f of ORDEM) o[f] = new Set(payload.porFase[f] ?? []);
    setEfetivo(o);
  }, [payload]);

  const timesById = React.useMemo(
    () => new Map(payload.times.map((t) => [t.id, t])),
    [payload.times],
  );
  const cadeadosDaFase = React.useMemo(
    () => new Set(payload.cadeados[fase] ?? []),
    [payload.cadeados, fase],
  );

  const idx = ORDEM.indexOf(fase);
  const cfgFase = FASES[idx];

  // Pool selecionável: 16avos ou "mostrar todos" → 48 times; senão, efetivo
  // da fase anterior (estado local, pra refletir edição imediata).
  const poolIds: string[] = React.useMemo(() => {
    if (fase === "16avos" || mostrarTodos) return payload.times.map((t) => t.id);
    return [...efetivo[ORDEM[idx - 1]]];
  }, [fase, mostrarTodos, payload.times, efetivo, idx]);

  const participamIds = poolIds.filter((id) => efetivo[fase].has(id));
  const foraIds = poolIds.filter((id) => !efetivo[fase].has(id));
  const marcados = efetivo[fase].size;
  const excesso = marcados > cfgFase.alvo;

  function trocarFase(f: FasePalpiteMata) {
    setFase(f);
    setMostrarTodos(false);
  }

  function toggle(timeId: string) {
    // 1) update otimista local (com a mesma cascata da escrita)
    setEfetivo((prev) => {
      const next = {} as Record<FasePalpiteMata, Set<string>>;
      for (const f of ORDEM) next[f] = new Set(prev[f]);
      if (next[fase].has(timeId)) {
        for (let i = idx; i < ORDEM.length; i++) next[ORDEM[i]].delete(timeId); // desliga: + profundas
      } else {
        for (let i = 0; i <= idx; i++) next[ORDEM[i]].add(timeId); // liga: + rasas
      }
      return next;
    });
    // 2) persiste + recalcula em background (não bloqueia o clique)
    void persistir(() => toggleTimeNaFase(fase, timeId));
  }

  function recalcAuto() {
    void persistir(
      () => recalcularAutomatico16avos(),
      "16 Avos recalculado pela classificação dos grupos.",
    );
  }

  async function persistir(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMsg?: string,
  ) {
    setSalvando(true);
    try {
      const res = await fn();
      if (!res.ok) {
        toast({ title: "Erro", description: res.error, variant: "destructive" });
        router.refresh(); // volta ao estado real
        return;
      }
      if (successMsg) toast({ title: successMsg, variant: "success" });
    } finally {
      setSalvando(false);
    }
    triggerRecalcDebounced();
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* Segmented control de fases */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-md bg-muted p-0.5 text-xs font-bold">
            {FASES.map((f) => (
              <button
                key={f.key}
                onClick={() => trocarFase(f.key)}
                className={cn(
                  "rounded px-2.5 py-1.5 transition-colors",
                  fase === f.key ? "bg-white shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {salvando && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> salvando…
            </span>
          )}
        </div>

        {/* Barra de status */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <div className="text-muted-foreground">
            {fase === "16avos" ? (
              <>
                <span className="font-bold text-foreground">Provisório</span> ·{" "}
                {payload.gruposFinalizados}/{payload.gruposTotal} jogos de grupo finalizados
                <span className="text-[11px]"> (atualiza a cada resultado)</span>
              </>
            ) : (
              <>Pool herdado dos classificados da fase anterior</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={excesso ? "warning" : marcados === cfgFase.alvo ? "success" : "muted"}>
              {marcados}/{cfgFase.alvo} marcados{excesso ? " ⚠️" : ""}
            </Badge>
            {fase === "16avos" && (
              <Button size="sm" variant="outline" onClick={recalcAuto} disabled={salvando}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Recalcular automático
              </Button>
            )}
            {fase !== "16avos" && (
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium">
                <input
                  type="checkbox"
                  checked={mostrarTodos}
                  onChange={(e) => setMostrarTodos(e.target.checked)}
                />
                Mostrar todos os 48
              </label>
            )}
          </div>
        </div>

        {/* Participam (verde) */}
        <Secao
          titulo={`✅ Participam (${participamIds.length})`}
          ids={participamIds}
          fase={fase}
          timesById={timesById}
          origem={payload.origem}
          cadeados={cadeadosDaFase}
          verde
          onToggle={toggle}
          disabled={salvando}
        />

        {/* Fora / Vice (cinza) */}
        <Secao
          titulo={
            fase === "campeao"
              ? `🥈 Vice (${foraIds.length})`
              : `⬇️ Fora desta fase (${foraIds.length})`
          }
          ids={foraIds}
          fase={fase}
          timesById={timesById}
          origem={payload.origem}
          cadeados={cadeadosDaFase}
          verde={false}
          onToggle={toggle}
          disabled={salvando}
        />
      </CardContent>
    </Card>
  );
}

function Secao({
  titulo,
  ids,
  fase,
  timesById,
  origem,
  cadeados,
  verde,
  onToggle,
  disabled,
}: {
  titulo: string;
  ids: string[];
  fase: FasePalpiteMata;
  timesById: Map<string, RosterUIPayload["times"][number]>;
  origem: Record<string, string>;
  cadeados: Set<string>;
  verde: boolean;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{titulo}</h4>
      {ids.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
          {ids.map((id) => {
            const t = timesById.get(id);
            if (!t) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggle(id)}
                disabled={disabled}
                style={{ WebkitTapHighlightColor: "transparent" }}
                className={cn(
                  "flex min-h-[44px] items-center gap-1.5 rounded-md border-2 p-1.5 text-left text-xs transition-all active:scale-95 disabled:opacity-60",
                  verde
                    ? "border-festive-green bg-festive-green/10"
                    : "border-border bg-white hover:bg-festive-gold/10",
                )}
              >
                {t.bandeira_url && (
                  <Image src={t.bandeira_url} alt={t.nome} width={18} height={13} unoptimized className="rounded-sm" />
                )}
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-bold">{t.nome}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {fase === "16avos" && origem[id] ? origem[id] : `Grupo ${t.grupo}`}
                  </span>
                </span>
                {verde && <Check className="h-3.5 w-3.5 shrink-0 text-festive-green" />}
                {cadeados.has(id) && <Lock className="h-3 w-3 shrink-0 text-festive-orange" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
