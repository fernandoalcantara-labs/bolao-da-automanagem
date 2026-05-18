"use client";

import * as React from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

type Grupo = {
  chave: string;
  label: string;
  manual: boolean;
  gols: number;
  palpites: { id: string; user_id: string; user_nome: string; acertou: boolean | null }[];
};

export function ArtilheirosValidacao({ grupos }: { grupos: Grupo[] }) {
  const [state, setState] = React.useState(grupos);
  const [loading, setLoading] = React.useState<string | null>(null);

  async function toggle(palpiteId: string, novoValor: boolean) {
    setLoading(palpiteId);
    const supabase = createClient();
    const { error } = await supabase
      .from("palpites_artilheiro")
      .update({ acertou: novoValor })
      .eq("id", palpiteId);
    setLoading(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setState((s) =>
      s.map((g) => ({
        ...g,
        palpites: g.palpites.map((p) =>
          p.id === palpiteId ? { ...p, acertou: novoValor } : p,
        ),
      })),
    );
    toast({
      title: novoValor ? "Marcado como acertador" : "Desmarcado",
      description: "Lembre de rodar 'Recalcular' no painel admin pra atualizar o ranking.",
      variant: "success",
    });
  }

  const totalAcertaram = state.reduce(
    (acc, g) => acc + g.palpites.filter((p) => p.acertou).length,
    0,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <strong>{totalAcertaram}</strong> usuário(s) marcado(s) como acertador(es) ·{" "}
        <strong>{state.length}</strong> jogador(es) palpitado(s)
      </p>

      {state
        .sort((a, b) => b.palpites.length - a.palpites.length)
        .map((g) => (
          <Card key={g.chave} className={g.manual ? "border-amber-500/40" : ""}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold">{g.label}</p>
                  {g.manual && <Badge variant="warning">texto livre</Badge>}
                  {g.gols > 0 && (
                    <Badge variant="default">{g.gols} gols no torneio</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {g.palpites.length} palpite(s)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3">
                {g.palpites.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded border border-border/40 bg-card/40 px-2 py-1"
                  >
                    <span className="text-sm">{p.user_nome}</span>
                    {loading === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : p.acertou ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/20"
                        onClick={() => toggle(p.id, false)}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> acertou
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-muted-foreground"
                        onClick={() => toggle(p.id, true)}
                      >
                        marcar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
