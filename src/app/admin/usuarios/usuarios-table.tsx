"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { MemoriaCalculoToggle } from "./memoria-calculo";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: "admin" | "user";
  pago: boolean;
  created_at: string;
  pontos_totais?: number;
};

export function UsuariosTable({ users }: { users: Usuario[] }) {
  const [state, setState] = React.useState(users);
  const [loading, setLoading] = React.useState<string | null>(null);

  async function toggle(id: string, field: "pago" | "role") {
    setLoading(id + field);
    const supabase = createClient();
    const target = state.find((u) => u.id === id);
    if (!target) return;
    const update =
      field === "pago"
        ? { pago: !target.pago }
        : { role: (target.role === "admin" ? "user" : "admin") as "user" | "admin" };
    const { error } = await supabase.from("users").update(update).eq("id", id);
    setLoading(null);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setState((s) => s.map((u) => (u.id === id ? ({ ...u, ...update } as Usuario) : u)));
    toast({ title: "Atualizado!", variant: "success" });
  }

  return (
    <Card className="overflow-hidden">
      <div className="divide-y-2 divide-border/40">
        {state.map((u) => (
          <div key={u.id} className="p-3 sm:p-4">
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[2fr_2fr_auto_auto_auto] sm:gap-4">
              <div className="min-w-0">
                <p className="line-clamp-1 font-bold">{u.nome}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>📞 {u.telefone ?? "—"}</p>
                {u.pontos_totais !== undefined && (
                  <p className="font-bold text-festive-green">{u.pontos_totais} pts</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={u.role === "admin"}
                  onCheckedChange={() => toggle(u.id, "role")}
                  disabled={loading === u.id + "role"}
                />
                {u.role === "admin" ? <Badge variant="default">admin</Badge> : <span className="text-[10px] text-muted-foreground">user</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={u.pago}
                  onCheckedChange={() => toggle(u.id, "pago")}
                  disabled={loading === u.id + "pago"}
                />
                {u.pago ? (
                  <Badge variant="success">pago</Badge>
                ) : (
                  <Badge variant="warning">pendente</Badge>
                )}
              </div>
              <MemoriaCalculoToggle userId={u.id} nome={u.nome} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
