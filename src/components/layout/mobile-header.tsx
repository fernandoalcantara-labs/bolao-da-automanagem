"use client";

import Link from "next/link";
import { Mascot } from "@/components/ui/mascot";
import { DesignedBySorriso } from "./designed-by-sorriso";
import { ShareButton } from "@/components/share/share-button";

export function MobileHeader({
  nomeBolao,
  valorArrecadado,
}: {
  nomeBolao: string;
  valorArrecadado: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gradient-header px-3 shadow-md lg:hidden">
      <Link href="/" className="flex items-center gap-2 min-w-0">
        <Mascot size={32} />
        <span className="flex flex-col leading-tight min-w-0">
          <span className="line-clamp-1 font-fredoka text-xs font-extrabold tracking-tight text-white">
            {nomeBolao}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/80">
            🇧🇷 Copa 2026
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-1.5">
        <ShareButton nomeBolao={nomeBolao} valorArrecadado={valorArrecadado} compact />
        <DesignedBySorriso compact />
      </div>
    </header>
  );
}
