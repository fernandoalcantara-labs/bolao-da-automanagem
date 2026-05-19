"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { atualizarPerfilAction } from "./actions";

type Props = {
  user: {
    id: string;
    nome: string;
    nome_exibicao: string;
    email: string;
    telefone: string | null;
  };
};

export function PerfilForm({ user }: Props) {
  const [nomeExibicao, setNomeExibicao] = React.useState(user.nome_exibicao);
  const [nome, setNome] = React.useState(user.nome);
  const [telefone, setTelefone] = React.useState(user.telefone ?? "");
  const [saving, setSaving] = React.useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await atualizarPerfilAction({
      nome,
      nome_exibicao: nomeExibicao,
      telefone: telefone || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Não rolou 😬", description: res.error, variant: "destructive" });
      return;
    }
    toast({ title: "Perfil atualizado! 🎉", variant: "success" });
    // Hard reload pra layout pegar o novo nome no sidebar/bottom-nav
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome_exibicao" className="font-bold">
          Nome de exibição <span className="text-festive-red">*</span>
        </Label>
        <Input
          id="nome_exibicao"
          value={nomeExibicao}
          onChange={(e) => setNomeExibicao(e.target.value)}
          required
          minLength={2}
          maxLength={30}
          placeholder="Ex: Fernandinho"
        />
        <p className="text-[11px] font-medium text-muted-foreground">
          Esse é o nome que aparece no ranking e nos gráficos. Outros craques verão isso.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nome" className="font-bold">Nome completo</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          minLength={3}
          placeholder="Fernando Alcantara Rocha"
        />
        <p className="text-[11px] font-medium text-muted-foreground">
          Só o admin e você veem. Usado pra controle de pagamentos.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="font-bold">Email</Label>
        <Input id="email" value={user.email} disabled />
        <p className="text-[11px] font-medium text-muted-foreground">
          Não dá pra mudar — segurança.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefone" className="font-bold">
          Telefone <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          type="tel"
          placeholder="(11) 91234-5678"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar perfil
        </Button>
      </div>
    </form>
  );
}
