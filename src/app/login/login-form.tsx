"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { MICROCOPY } from "@/lib/microcopy";

export function LoginForm() {
  const router = useRouter();
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Detecta autofill do Chrome que pode não disparar onChange.
  // Polling rápido no mount + onFocus pra sincronizar state com DOM.
  React.useEffect(() => {
    const t = setInterval(() => {
      if (emailRef.current && emailRef.current.value && !email) {
        setEmail(emailRef.current.value);
      }
      if (passwordRef.current && passwordRef.current.value && !password) {
        setPassword(passwordRef.current.value);
      }
    }, 250);
    const stop = setTimeout(() => clearInterval(t), 3000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [email, password]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Última chance: lê direto do DOM caso o state ainda não tenha sincronizado
    const finalEmail = email || emailRef.current?.value || "";
    const finalPassword = password || passwordRef.current?.value || "";

    if (!finalEmail || !finalPassword) {
      toast({ title: "Preenche email e senha 🙏", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      // Timeout de 15s — se a requisição travar, dá erro claro em vez do
      // spinner ficar preso pra sempre.
      const result = await Promise.race([
        supabase.auth.signInWithPassword({
          email: finalEmail,
          password: finalPassword,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("A conexão demorou demais. Tenta de novo?")), 15000),
        ),
      ]);
      const { error } = result;
      if (error) {
        toast({
          title: "Não consegui entrar 😬",
          description: error.message.includes("Invalid")
            ? "Email ou senha incorretos. Confere aí?"
            : error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      toast({ ...MICROCOPY.toastLoginFeito, variant: "success" });
      window.location.href = "/palpites/grupos";
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
          ref={emailRef}
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
          ref={passwordRef}
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
