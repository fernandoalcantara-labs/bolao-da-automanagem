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

type SidebarUser = { id: string; nome: string; role: string } | null;

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast({ ...MICROCOPY.toastLogoutFeito, variant: "success" });
    // Hard reload pro layout re-renderizar com user=null
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

      <div className="space-y-3 border-t-2 border-border/60 p-4">
        {user ? (
          <div className="space-y-2">
            <Link
              href="/perfil"
              className="group flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-festive-gold/10"
              title="Editar perfil"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-gold text-sm font-extrabold text-zinc-900 shadow-stack-gold">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="line-clamp-1 text-sm font-extrabold group-hover:text-festive-gold-dark">
                  {user.nome} <span className="opacity-50">✏️</span>
                </p>
                {user.role === "admin" && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-festive-green">
                    👑 Admin
                  </p>
                )}
              </div>
            </Link>
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
