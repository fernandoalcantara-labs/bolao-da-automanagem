"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Save, Search, Trophy, X, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { MICROCOPY } from "@/lib/microcopy";
import { miniConfetti } from "@/lib/confetti";
import { useAutosave, lerCachePalpites } from "@/hooks/use-autosave";
import { ehErroApostasEncerradas } from "@/lib/palpites-bloqueio";
import { AutosaveStatusBadge } from "@/components/palpites/autosave-status";

type Player = {
  id: string;
  nome: string;
  time_nome: string;
  bandeira_url: string;
  gols_torneio: number;
};

type ModoPalpite =
  | { tipo: "lista"; playerId: string; nome: string }
  | { tipo: "manual"; nome: string };

export function ArtilheiroForm({
  players,
  atual,
  atualManual,
  fechado: fechadoInicial,
  userId,
}: {
  players: Player[];
  atual: string | null;
  atualManual?: string | null;
  fechado: boolean;
  userId: string;
}) {
  const storageKey = `bolao:palpites:artilheiro:${userId}`;
  // "Sombra" do fechado: o trigger barra (encerrado/prazo) → trava sem reload.
  const [bloqueado, setBloqueado] = React.useState(false);
  const fechado = fechadoInicial || bloqueado;
  const [busca, setBusca] = React.useState("");
  const [modo, setModo] = React.useState<ModoPalpite | null>(() => {
    // 1. Default: estado do server
    let inicial: ModoPalpite | null = null;
    if (atual) {
      const p = players.find((x) => x.id === atual);
      inicial = p ? { tipo: "lista", playerId: p.id, nome: p.nome } : null;
    } else if (atualManual) {
      inicial = { tipo: "manual", nome: atualManual };
    }
    // 2. Hidratacao: se o cache tem palpite e o server nao, usa cache
    //    (caso 'escolheu e dei F5 antes do save')
    if (!inicial) {
      const cache = lerCachePalpites<ModoPalpite | null>(storageKey);
      if (cache) inicial = cache;
    }
    return inicial;
  });
  const [saving, setSaving] = React.useState(false);

  const { status: autosaveStatus, forceSave } = useAutosave({
    storageKey,
    state: modo,
    enabled: !fechado,
    saveRemote: async (snapshot) => {
      if (!snapshot) return;
      const supabase = createClient();
      const payload: Record<string, unknown> =
        snapshot.tipo === "lista"
          ? { user_id: userId, player_id: snapshot.playerId, player_nome_manual: null }
          : { user_id: userId, player_id: null, player_nome_manual: snapshot.nome };
      const { error } = await supabase
        .from("palpites_artilheiro")
        .upsert(payload as any, { onConflict: "user_id" });
      if (error) {
        if (ehErroApostasEncerradas(error)) {
          setBloqueado(true);
          toast({
            title: "Apostas encerradas",
            description: "Não dá mais pra editar palpites (encerrado pelo admin ou prazo vencido).",
            variant: "destructive",
          });
        }
        throw error;
      }
    },
  });

  const filtered = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return players.slice(0, 30);
    return players
      .filter(
        (p) => p.nome.toLowerCase().includes(q) || p.time_nome.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [busca, players]);

  const matchExato = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return false;
    return players.some((p) => p.nome.toLowerCase() === q);
  }, [busca, players]);

  const podeConfirmarManual = busca.trim().length >= 3 && !matchExato;

  async function salvar() {
    if (!modo) return;
    setSaving(true);
    try {
      await forceSave();
      toast({ ...MICROCOPY.toastArtilheiroSalvo, variant: "success" });
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

  function pickPlayer(p: Player) {
    setModo({ tipo: "lista", playerId: p.id, nome: p.nome });
    setBusca("");
  }

  function pickManual() {
    setModo({ tipo: "manual", nome: busca.trim() });
    setBusca("");
  }

  return (
    <div className="space-y-4">
      {!fechado && (
        <div className="flex justify-end">
          <AutosaveStatusBadge status={autosaveStatus} />
        </div>
      )}
      {/* Palpite atual */}
      {modo && (
        <Card className="border-primary/40">
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Seu palpite de artilheiro:</p>
                <p className="text-lg font-semibold">{modo.nome}</p>
                {modo.tipo === "manual" && (
                  <Badge variant="warning" className="mt-1">
                    Texto livre · admin valida manualmente
                  </Badge>
                )}
              </div>
            </div>
            {!fechado && (
              <Button variant="ghost" size="sm" onClick={() => setModo(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Busca */}
      {!fechado && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador ou seleção…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Botão para texto livre */}
      {!fechado && podeConfirmarManual && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>
                <strong>{busca}</strong> não está na lista. Pode registrar como texto livre — o
                organizador valida no fim da Copa.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={pickManual}>
              Usar &quot;{busca.trim().slice(0, 20)}&quot;
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {!fechado && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const picked = modo?.tipo === "lista" && modo.playerId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPlayer(p)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40",
                  picked && "border-primary bg-primary/10 shadow-md shadow-primary/20",
                )}
              >
                {p.bandeira_url && (
                  <Image
                    src={p.bandeira_url}
                    alt={p.time_nome}
                    width={28}
                    height={20}
                    className="rounded-sm shadow"
                    unoptimized
                  />
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="line-clamp-1 text-sm font-medium">{p.nome}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{p.time_nome}</p>
                </div>
                {p.gols_torneio > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                    <Trophy className="h-3 w-3" /> {p.gols_torneio}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!fechado && modo && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button onClick={salvar} disabled={saving} size="lg">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar artilheiro
          </Button>
        </div>
      )}
    </div>
  );
}
