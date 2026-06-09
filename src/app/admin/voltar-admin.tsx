"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Botão "voltar ao menu admin" (item 47). Aparece em todas as subpáginas
 * de /admin/*; some na raiz /admin (não teria pra onde voltar).
 */
export function VoltarAdmin() {
  const pathname = usePathname();
  if (pathname === "/admin") return null;
  return (
    <Link
      href="/admin"
      aria-label="Voltar ao menu admin"
      className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao admin
    </Link>
  );
}
