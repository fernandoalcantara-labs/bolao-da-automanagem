"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { PoweredByClaudio } from "./powered-by-claudio";
import { Mascot } from "@/components/ui/mascot";
import { NAV_ITEMS } from "./nav-items";
import { MICROCOPY } from "@/lib/microcopy";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<{ id: string; nome: string; role: string } | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function carregarPerfil(userId: string) {
      const { data: perfil } = await supabase
        .from("users")
        .select("id, role, nome")
        .eq("id", userId)
        .single();
      if (mounted && perfil) setUser(perfil as any);
    }

    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) await carregarPerfil(data.user.id);
    })();

    // Ouve login/logout em tempo real (resolve o caso da Sidebar não remontar
    // entre /login e /palpites/grupos)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
          await carregarPerfil(session.user.id);
        } else if (event === "SIGNED_OUT") {
          if (mounted) setUser(null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({ ...MICROCOPY.toastLogoutFeito, variant: "success" });
    setUser(null);
    // Hard navigation pra garantir que o estado de auth seja limpo em todos
    // os componentes (sidebar, bottom-nav, headers de páginas, etc).
    window.location.href = "/";
  }

  const items = NAV_ITEMS.filter((i) => {
    if (i.admin) return user?.role === "admin";
    if (i.auth) return !!user;
    return true;
  });

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-2 border-border bg-white shadow-stack lg:flex"
      aria-label="Navegação principal"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-border/60">
        <Mascot size={44} />
        <span className="flex flex-col leading-tight">
          <span className="font-fredoka text-base font-extrabold tracking-tight text-foreground">
            Bolão da AutoManagem
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-festive-green">
            🇧🇷 Copa 2026
          </span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                active
                  ? "bg-festive-gold/20 text-festive-gold-dark"
                  : "text-muted-foreground hover:bg-festive-gold/10 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-festive-gold-dark" />
              )}
              <Icon className={cn("h-4 w-4", active && "text-festive-gold-dark")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sair */}
      <div className="space-y-3 border-t-2 border-border/60 p-4">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-gold text-sm font-extrabold text-zinc-900 shadow-stack-gold">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="line-clamp-1 text-sm font-extrabold">{user.nome}</p>
                {user.role === "admin" && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-festive-green">
                    👑 Admin
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={sair}
              className="btn-stack inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-white px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-festive-red/40 hover:bg-festive-red/5 hover:text-festive-red"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="btn-stack inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-festive-green bg-white px-3 py-2 text-xs font-bold text-festive-green hover:bg-festive-green/5"
          >
            <LogIn className="h-3.5 w-3.5" /> {MICROCOPY.entrar}
          </Link>
        )}
        <div className="flex justify-center">
          <PoweredByClaudio />
        </div>
      </div>
    </aside>
  );
}
