"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { PoweredByClaudio } from "./powered-by-claudio";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; auth?: boolean; admin?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Painel" },
  { href: "/palpites/grupos", label: "Fase de grupos", auth: true },
  { href: "/palpites/mata-mata", label: "Mata-mata", auth: true },
  { href: "/palpites/artilheiro", label: "Artilheiro", auth: true },
  { href: "/pagamento", label: "Pagamento" },
  { href: "/admin", label: "Admin", admin: true },
];

export function Header() {
  const pathname = usePathname();
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
      if (perfil) setUser(perfil);
    })();
  }, []);

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
            <Link
              href="/admin"
              className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
            >
              Olá, <span className="font-medium text-foreground">{user.nome.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent sm:inline-block"
            >
              Entrar
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
            {!user && (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
              >
                Entrar
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
