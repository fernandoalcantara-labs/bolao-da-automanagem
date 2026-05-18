"use client";

import Link from "next/link";
import { Mascot } from "@/components/ui/mascot";
import { DesignedBySorriso } from "./designed-by-sorriso";

/**
 * Header simplificado para mobile (< 1024px).
 * Header do mobile com gradiente verde estilo Brasil-festivo.
 */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gradient-header px-4 shadow-md lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Mascot size={36} />
        <span className="flex flex-col leading-tight">
          <span className="font-fredoka text-sm font-extrabold tracking-tight text-white">
            Bolão da AutoManagem
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/80">
            🇧🇷 Copa 2026
          </span>
        </span>
      </Link>
      <DesignedBySorriso compact />
    </header>
  );
}
