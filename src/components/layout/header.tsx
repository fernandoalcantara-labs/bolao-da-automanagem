"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Trophy, LogOut, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { PoweredByClaudio } from "./powered-by-claudio";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

type NavItem = { href: string; label: string; auth?: boolean; admin?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Painel" },
  { href: "/palpites/grupos", label: "Grupos", auth: true },
  { href: "/palpites/mata-mata", label: "Mata-mata", auth: true },
  { href: "/palpites/artilheiro", label: "Artilheiro", auth: true },
  { href: "/regras", label: "Regras" },
  { href: "/pagamento", label: "Pagamento" },
  { href: "/admin", label: "Admin", admin: true },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; role: string; nome: string } | null>(null);

  useEffect(() => {
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

  const filteredNav = NAV.filter((item) => {
    if (item.admin) return user?.role === "admin";
    if (item.auth) return !!user;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brasil-verde to-brasil-amarelo text-white shadow-lg shadow-brasil-verde/30">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight">Bolão da AutoManagem</span>
            <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              FIFA World Cup 2026
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {filteredNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname === item.href && "bg-accent text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs text-muted-foreground">
                Olá, <span className="font-medium text-foreground">{user.nome.split(" ")[0]}</span>
              </span>
              <button
                onClick={sair}
                aria-label="Sair"
                className="rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-accent"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent sm:inline-flex"
            >
              <LogIn className="h-3.5 w-3.5" /> Entrar
            </Link>
          )}
          <PoweredByClaudio className="hidden sm:inline-flex" />
          <PoweredByClaudio className="sm:hidden" compact />
          <button
            type="button"
            className="rounded-md border border-border p-2 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Abrir menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 lg:hidden">
          <nav className="container flex flex-col py-3">
            {filteredNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname === item.href && "bg-accent text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { setOpen(false); sair(); }}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sair ({user.nome.split(" ")[0]})
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
              >
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
            )}
            <div className="mt-3 flex justify-end pt-2">
              <PoweredByClaudio />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
