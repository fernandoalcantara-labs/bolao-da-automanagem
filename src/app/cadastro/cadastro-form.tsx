"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { MICROCOPY } from "@/lib/microcopy";
import { bigConfetti } from "@/lib/confetti";

export function CadastroForm() {
  const router = useRouter();
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nome || !email || !senha) {
      toast({ title: "Preenche nome, email e senha 🙏", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome, telefone: telefone || null } },
      });
      if (error) {
        toast({ title: "Eita 😬", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ ...MICROCOPY.toastCadastroFeito, variant: "success" });
      bigConfetti();
      // Hard navigation pra garantir que sidebar/bottom-nav vejam o user logado
      setTimeout(() => {
        window.location.href = "/pagamento";
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão. Tenta de novo.";
      toast({ title: "Eita 😬", description: msg, variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome" className="font-bold">Nome completo</Label>
        <Input
          id="nome"
          name="nome"
          required
          minLength={3}
          placeholder="Ex: Fernando Silva"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="font-bold">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha" className="font-bold">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefone" className="font-bold">
          Telefone <span className="text-muted-foreground font-normal">(opcional — pra contato sobre o PIX)</span>
        </Label>
        <Input
          id="telefone"
          name="telefone"
          type="tel"
          placeholder="(11) 91234-5678"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          autoComplete="tel"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading} variant="gold" size="lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PartyPopper className="mr-2 h-4 w-4" />}
        {loading ? "Cadastrando…" : MICROCOPY.cadastrar}
      </Button>
    </form>
  );
}
