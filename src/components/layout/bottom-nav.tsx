"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, LogOut, LogIn, Trophy, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import { NAV_ITEMS } from "./nav-items";
import { PoweredByClaudio } from "./powered-by-claudio";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<{ id: string; nome: string; role: string } | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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
    setDrawerOpen(false);
    router.refresh();
    router.push("/");
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
    <>
      <nav
        role="navigation"
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md lg:hidden"
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
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          {/* Mais */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-5 w-5" />
                Mais
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="mb-4 flex items-center gap-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brasil-verde to-brasil-amarelo text-white">
                  <Trophy className="h-5 w-5" />
                </span>
                <span className="font-bold tracking-tight">Bolão da AutoManagem</span>
              </Link>

              {user && (
                <div className="mb-3 flex items-center gap-2.5 rounded-md border border-border bg-card p-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {user.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="line-clamp-1 text-sm font-medium">{user.nome}</p>
                    {user.role === "admin" && (
                      <p className="text-[10px] uppercase tracking-wider text-primary">Admin</p>
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
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="space-y-3 border-t border-border/60 pt-4">
                {user ? (
                  <button
                    onClick={sair}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setDrawerOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <LogIn className="h-4 w-4" /> Entrar
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
    </>
  );
}
