"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: "admin" | "user";
  pago: boolean;
  created_at: string;
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
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Pago</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nome}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell className="text-muted-foreground">{u.telefone ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={u.role === "admin"}
                    onCheckedChange={() => toggle(u.id, "role")}
                    disabled={loading === u.id + "role"}
                  />
                  {u.role === "admin" && <Badge variant="default">admin</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
