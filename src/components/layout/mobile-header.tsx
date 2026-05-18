"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { DesignedBySorriso } from "./designed-by-sorriso";

/**
 * Header simplificado para mobile (< 1024px).
 * No desktop o sidebar substitui o header completamente.
 */
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/85 px-4 backdrop-blur-md lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brasil-verde to-brasil-amarelo text-white">
          <Trophy className="h-4 w-4" />
        </span>
        <span className="text-sm font-bold tracking-tight">Bolão da AutoManagem</span>
      </Link>
      <DesignedBySorriso compact />
    </header>
  );
}
