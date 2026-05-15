"use client";

import * as React from "react";
import { Loader2, RefreshCw, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function AdminActions() {
  const [syncing, setSyncing] = React.useState(false);
  const [recalcing, setRecalcing] = React.useState(false);

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
    const res = await fetch("/api/recalcular", { method: "POST" });
    setRecalcing(false);
    if (res.ok) {
      toast({ title: "Pontuações recalculadas!", variant: "success" });
    } else {
      toast({ title: "Erro ao recalcular", description: await res.text(), variant: "destructive" });
    }
  }

  return (
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
  );
}
