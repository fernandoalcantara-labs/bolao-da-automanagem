"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LogIn, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { PoweredByClaudio } from "./powered-by-claudio";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<{ id: string; nome: string; role: string } | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: perfil } = await supabase
        .from("users")
        .select("id, role, nome")
        .eq("id", data.user.id)
        .single();
      if (perfil) setUser(perfil as any);
    })();
  }, []);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({ title: "Você saiu da sua conta", variant: "success" });
    setUser(null);
    router.refresh();
    router.push("/");
  }

  const items = NAV_ITEMS.filter((i) => {
    if (i.admin) return user?.role === "admin";
    if (i.auth) return !!user;
    return true;
  });

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/60 bg-card/40 backdrop-blur-md lg:flex"
      aria-label="Navegação principal"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brasil-verde to-brasil-amarelo text-white shadow-lg shadow-brasil-verde/30">
          <Trophy className="h-5 w-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">Bolão da AutoManagem</span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            FIFA WC 2026
          </span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
              )}
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sair */}
      <div className="space-y-3 border-t border-border/60 p-4">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="line-clamp-1 text-sm font-medium">{user.nome}</p>
                {user.role === "admin" && (
                  <p className="text-[10px] uppercase tracking-wider text-primary">Admin</p>
                )}
              </div>
            </div>
            <button
              onClick={sair}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <LogIn className="h-3.5 w-3.5" /> Entrar
          </Link>
        )}
        <PoweredByClaudio className="w-full justify-center" />
      </div>
    </aside>
  );
}
