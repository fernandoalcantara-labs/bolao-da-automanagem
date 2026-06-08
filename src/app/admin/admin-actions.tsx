"use client";

import * as React from "react";
import { Loader2, RefreshCw, Calculator, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { setSyncAutomatico, setApostasEncerradas, setApostasAutomatico } from "./sync-actions";
import { DEADLINE_FASE_GRUPOS } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
// nome_exibicao do user e' usado cru — quem personalizou via /perfil tem prioridade

type RecalcLog = {
  duracao_ms: number;
  total_palpites_grupos: number;
  total_palpites_mata: number;
  total_palpites_artilheiro: number;
  jogos_finalizados: number;
  usuarios_alterados: Array<{
    user_id: string;
    nome: string;
    antes: number;
    depois: number;
    delta: number;
  }>;
};

export function AdminActions({
  syncAutomaticoInicial = true,
  apostasEncerradasInicial = false,
  apostasOverrideInicial = false,
}: {
  syncAutomaticoInicial?: boolean;
  apostasEncerradasInicial?: boolean;
  apostasOverrideInicial?: boolean;
}) {
  const [syncing, setSyncing] = React.useState(false);
  const [recalcing, setRecalcing] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const [log, setLog] = React.useState<RecalcLog | null>(null);
  const [syncAuto, setSyncAuto] = React.useState(syncAutomaticoInicial);
  const [savingAuto, setSavingAuto] = React.useState(false);
  const [encerradas, setEncerradas] = React.useState(apostasEncerradasInicial);
  const [override, setOverride] = React.useState(apostasOverrideInicial);
  const [savingEnc, setSavingEnc] = React.useState(false);
  // Prazo vencido: só no client (evita mismatch de hidratação com Date.now).
  const [prazoVencido, setPrazoVencido] = React.useState(false);
  React.useEffect(() => {
    setPrazoVencido(Date.now() >= DEADLINE_FASE_GRUPOS.getTime());
  }, []);
  // Estado EFETIVO (espelha o trigger): override ? encerradas : prazo.
  const efetivoEncerradas = override ? encerradas : prazoVencido;

  async function alternarSyncAuto(v: boolean) {
    setSyncAuto(v); // otimista
    setSavingAuto(true);
    const res = await setSyncAutomatico(v);
    setSavingAuto(false);
    if (!res.ok) {
      setSyncAuto(!v); // reverte
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    toast({
      title: v ? "Atualização automática LIGADA" : "Atualização automática DESLIGADA",
      description: v
        ? "O cron volta a sincronizar resultados."
        : "O cron não vai mais sobrescrever resultados (sync manual segue funcionando).",
      variant: "success",
    });
  }

  async function alternarEncerradas(v: boolean) {
    const prevEnc = encerradas;
    const prevOv = override;
    setEncerradas(v); // otimista
    setOverride(true); // mexer = controle manual
    setSavingEnc(true);
    const res = await setApostasEncerradas(v);
    setSavingEnc(false);
    if (!res.ok) {
      setEncerradas(prevEnc); // reverte
      setOverride(prevOv);
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    toast({
      title: v ? "Apostas ENCERRADAS (manual)" : "Apostas ABERTAS (manual)",
      description: v
        ? "Ninguém consegue mais salvar/alterar palpites (grupos, mata, artilheiro)."
        : "Os palpites voltaram a aceitar gravação — controle manual, ignora o prazo.",
      variant: "success",
    });
  }

  async function voltarAoAutomatico() {
    const prevOv = override;
    setOverride(false); // otimista
    setSavingEnc(true);
    const res = await setApostasAutomatico();
    setSavingEnc(false);
    if (!res.ok) {
      setOverride(prevOv); // reverte
      toast({ title: "Erro", description: res.error, variant: "destructive" });
      return;
    }
    toast({
      title: "Apostas no AUTOMÁTICO",
      description: "Voltou a seguir o prazo (encerra sozinho no fim da fase de grupos).",
      variant: "success",
    });
  }

  async function sync() {
    setSyncing(true);
    const res = await fetch("/api/sync-matches", { method: "POST" });
    setSyncing(false);
    if (res.ok) {
      const j = await res.json();
      toast({ title: "Sincronizado!", description: `${j.atualizados ?? 0} jogos atualizados.`, variant: "success" });
    } else {
      toast({ title: "Erro ao sincronizar", description: await res.text(), variant: "destructive" });
    }
  }

  async function recalc() {
    setRecalcing(true);
    setLog(null);
    setLogOpen(true);
    try {
      const res = await fetch("/api/recalcular", { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        toast({ title: "Erro ao recalcular", description: text, variant: "destructive" });
        setLogOpen(false);
        return;
      }
      const j: { ok: true; log: RecalcLog } = await res.json();
      setLog(j.log);
    } finally {
      setRecalcing(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={sync} disabled={syncing} variant="outline">
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar com football-data.org
        </Button>
        <Button onClick={recalc} disabled={recalcing}>
          {recalcing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
          Recalcular pontuações
        </Button>
      </div>

      {/* Freio do cron (4B) — atualização automática de resultados */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm">
          <Switch checked={syncAuto} onCheckedChange={alternarSyncAuto} disabled={savingAuto} />
          <span className="font-medium">Atualização automática de resultados</span>
          {!syncAuto && <Badge variant="destructive">DESLIGADA</Badge>}
          {savingAuto && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Quando desligada, o cron não sobrescreve resultados. A sincronização manual (botão acima)
          continua funcionando.
        </p>
      </div>

      {/* Item 50 — freio manual de TODOS os palpites (modelo B2) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm">
          {/* Switch representa ABERTAS: ON/verde/direita = abertas. */}
          <Switch
            checked={!efetivoEncerradas}
            onCheckedChange={(aberto) => alternarEncerradas(!aberto)}
            disabled={savingEnc}
            className="data-[state=checked]:bg-festive-green"
            aria-label="Apostas abertas"
          />
          <span className="font-medium">
            Apostas:{" "}
            {efetivoEncerradas ? (
              <Badge variant="destructive">
                ENCERRADAS{!override && prazoVencido ? " (prazo)" : " (manual)"}
              </Badge>
            ) : (
              <Badge variant="success">ABERTAS{override ? " (manual)" : ""}</Badge>
            )}
          </span>
          {savingEnc && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[11px] text-muted-foreground">
            ON = abertas. Encerrar bloqueia no servidor (trigger) qualquer gravação de palpite —
            freio manual caso a sincronização falhe.
          </p>
          {override && (
            <button
              type="button"
              onClick={voltarAoAutomatico}
              disabled={savingEnc}
              className="text-[11px] font-bold text-primary underline disabled:opacity-50"
            >
              ↩ voltar ao automático (seguir o prazo)
            </button>
          )}
        </div>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-2xl">
          <div>
            <DialogTitle>🔄 Recálculo de pontuações</DialogTitle>
            <DialogDescription>
              {recalcing
                ? "Recalculando… isso pode levar alguns segundos."
                : log
                  ? "Aqui está o que mudou nesta rodada de recálculo."
                  : "Algo deu errado — verifique o toast."}
            </DialogDescription>
          </div>

          {recalcing && !log && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Processando…
            </div>
          )}

          {log && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="rounded-xl border-2 border-festive-green/40 bg-festive-green/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-festive-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Recálculo concluído em {(log.duracao_ms / 1000).toFixed(1)}s
                </div>
                <ul className="space-y-0.5 text-xs font-medium text-muted-foreground">
                  <li>• <strong className="text-foreground">{log.jogos_finalizados}</strong> jogo(s) finalizados no banco</li>
                  <li>• <strong className="text-foreground">{log.usuarios_alterados.length}</strong> usuário(s) com pontuação alterada</li>
                  <li>
                    • <strong className="text-foreground">
                      {log.total_palpites_grupos + log.total_palpites_mata + log.total_palpites_artilheiro}
                    </strong>{" "}
                    palpite(s) recalculados ({log.total_palpites_grupos} grupos + {log.total_palpites_mata} mata + {log.total_palpites_artilheiro} artilheiro)
                  </li>
                  <li>• Snapshots de ranking regeneradas</li>
                </ul>
              </div>

              {/* Tabela de usuários alterados */}
              {log.usuarios_alterados.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    Usuários com pontuação alterada
                  </p>
                  <div className="max-h-80 overflow-y-auto rounded-xl border-2 border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-festive-page/80 backdrop-blur">
                        <tr>
                          <th className="px-3 py-2 font-extrabold">Usuário</th>
                          <th className="px-3 py-2 text-right font-extrabold">Antes</th>
                          <th className="px-3 py-2 text-right font-extrabold">Agora</th>
                          <th className="px-3 py-2 text-right font-extrabold">Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {log.usuarios_alterados.map((u) => (
                          <tr key={u.user_id} className="border-t border-border/40">
                            <td className="px-3 py-1.5 font-bold">{u.nome}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{u.antes}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{u.depois}</td>
                            <td
                              className={`px-3 py-1.5 text-right tabular-nums font-extrabold ${
                                u.delta > 0
                                  ? "text-festive-green"
                                  : "text-festive-red"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {u.delta > 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {u.delta > 0 ? "+" : ""}
                                {u.delta}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  Nenhuma pontuação mudou — o recálculo apenas confirmou o estado atual.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
