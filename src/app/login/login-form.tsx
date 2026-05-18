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
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Eita 😬", description: error.message, variant: "destructive" });
      return;
    }
    toast({ ...MICROCOPY.toastLoginFeito, variant: "success" });
    // Hard reload garante que o Server Component layout re-renderize com o
    // user autenticado (cookies já gravados). router.refresh+push juntos
    // são race-condition: o push navega antes do refresh propagar.
    window.location.href = "/";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="font-bold">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="seuemail@exemplo.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="font-bold">Senha</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
        {MICROCOPY.entrar}
      </Button>
    </form>
  );
}
