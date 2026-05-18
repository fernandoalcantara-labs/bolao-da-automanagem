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
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome"));
    const email = String(fd.get("email"));
    const senha = String(fd.get("senha"));
    const telefone = (fd.get("telefone") as string) || null;

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, telefone } },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Eita 😬", description: error.message, variant: "destructive" });
      return;
    }
    toast({ ...MICROCOPY.toastCadastroFeito, variant: "success" });
    bigConfetti();
    router.push("/pagamento");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome" className="font-bold">Nome completo</Label>
        <Input id="nome" name="nome" required minLength={3} placeholder="Ex: Fernando Silva" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="font-bold">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="seuemail@exemplo.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha" className="font-bold">Senha</Label>
        <Input id="senha" name="senha" type="password" required minLength={6} autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefone" className="font-bold">
          Telefone <span className="text-muted-foreground font-normal">(opcional — pra contato sobre o PIX)</span>
        </Label>
        <Input id="telefone" name="telefone" type="tel" placeholder="(11) 91234-5678" />
      </div>
      <Button type="submit" className="w-full" disabled={loading} variant="gold" size="lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PartyPopper className="mr-2 h-4 w-4" />}
        {MICROCOPY.cadastrar}
      </Button>
    </form>
  );
}
