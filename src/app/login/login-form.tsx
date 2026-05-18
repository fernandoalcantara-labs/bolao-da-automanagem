"use client";

import * as React from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Lê do DOM caso o autofill do Chrome ainda não tenha disparado onChange
    const form = e.currentTarget;
    const finalEmail =
      email || (form.elements.namedItem("email") as HTMLInputElement)?.value || "";
    const finalPassword =
      password || (form.elements.namedItem("password") as HTMLInputElement)?.value || "";

    if (!finalEmail || !finalPassword) {
      toast({ title: "Preenche email e senha 🙏", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error, data } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: finalPassword,
      });
      if (error) {
        toast({
          title: "Não consegui entrar 😬",
          description: /invalid|credentials/i.test(error.message)
            ? "Email ou senha incorretos. Confere aí?"
            : error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (!data?.session) {
        toast({
          title: "Algo deu errado 🤔",
          description: "Login OK mas sessão veio vazia. Tenta de novo?",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      // Pequeno delay pros cookies de @supabase/ssr serem persistidos
      // via document.cookie antes da navegação SSR.
      await new Promise((r) => setTimeout(r, 150));
      window.location.replace("/palpites/grupos");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de conexão. Tenta de novo.";
      toast({ title: "Eita 😬", description: msg, variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="font-bold">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="font-bold">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
