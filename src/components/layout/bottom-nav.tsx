"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, LogOut, LogIn } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { NAV_ITEMS } from "./nav-items";
import { PoweredByClaudio } from "./powered-by-claudio";
import { Mascot } from "@/components/ui/mascot";
import { MICROCOPY } from "@/lib/microcopy";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<{ id: string; nome: string; role: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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
    setDrawerOpen(false);
    // Hard navigation pra limpar estado de auth em toda a árvore
    window.location.href = "/";
  }

  const primary = NAV_ITEMS.filter((i) => {
    if (i.admin) return user?.role === "admin";
    if (i.auth) return !!user;
    return i.primary;
  }).slice(0, 4);

  const secondary = NAV_ITEMS.filter((i) => !i.primary || i.admin).filter((i) => {
    if (i.admin) return user?.role === "admin";
    if (i.auth) return !!user;
    return true;
  });

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.05)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {primary.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-all active:scale-95",
                active ? "text-festive-gold-dark" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-xl transition-all",
                  active && "bg-festive-gold/20",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              {item.label}
            </Link>
          );
        })}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-muted-foreground transition-all hover:text-foreground active:scale-95">
              <div className="flex h-7 w-12 items-center justify-center rounded-xl">
                <MoreHorizontal className="h-5 w-5" />
              </div>
              Mais
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="flex flex-col">
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="mb-4 flex items-center gap-2.5"
            >
              <Mascot size={40} />
              <span className="font-fredoka font-extrabold tracking-tight">Bolão da AutoManagem</span>
            </Link>

            {user && (
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border-2 border-festive-gold/30 bg-festive-gold/5 p-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-gold text-base font-extrabold text-zinc-900 shadow-stack-gold">
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
            )}

            <nav className="flex-1 space-y-0.5">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                      active
                        ? "bg-festive-gold/20 text-festive-gold-dark"
                        : "text-muted-foreground hover:bg-festive-gold/10 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 border-t-2 border-border/60 pt-4">
              {user ? (
                <button
                  onClick={sair}
                  className="btn-stack inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-festive-red/30 bg-white px-3 py-2 text-sm font-bold text-festive-red hover:bg-festive-red/5"
                >
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="btn-stack inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-festive-green bg-white px-3 py-2 text-sm font-bold text-festive-green hover:bg-festive-green/5"
                >
                  <LogIn className="h-4 w-4" /> {MICROCOPY.entrar}
                </Link>
              )}
              <div className="flex justify-center">
                <PoweredByClaudio />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
