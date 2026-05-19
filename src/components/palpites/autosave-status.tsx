"use client";

import { Check, CloudOff, Loader2, AlertTriangle, Save } from "lucide-react";
import type { AutosaveStatus } from "@/hooks/use-autosave";
import { cn } from "@/lib/utils";

const VISUALS: Record<
  AutosaveStatus,
  { icon: typeof Check; label: string; cls: string }
> = {
  idle: {
    icon: Save,
    label: "Tudo salvo",
    cls: "text-muted-foreground bg-muted/40 border-border/40",
  },
  dirty: {
    icon: Loader2,
    label: "Salvando…",
    cls: "text-festive-gold-dark bg-festive-gold/15 border-festive-gold/40",
  },
  saving: {
    icon: Loader2,
    label: "Salvando…",
    cls: "text-festive-gold-dark bg-festive-gold/15 border-festive-gold/40",
  },
  saved: {
    icon: Check,
    label: "Salvo ✓",
    cls: "text-festive-green bg-festive-green/10 border-festive-green/40",
  },
  error: {
    icon: AlertTriangle,
    label: "Tentando salvar de novo…",
    cls: "text-festive-orange bg-festive-orange/10 border-festive-orange/40",
  },
  offline: {
    icon: CloudOff,
    label: "Sem conexão — salvo local",
    cls: "text-festive-red bg-festive-red/10 border-festive-red/40",
  },
};

export function AutosaveStatusBadge({
  status,
  className,
}: {
  status: AutosaveStatus;
  className?: string;
}) {
  const { icon: Icon, label, cls } = VISUALS[status];
  const spinning = status === "dirty" || status === "saving";
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[11px] font-extrabold transition-all",
        cls,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", spinning && "animate-spin")} />
      {label}
    </span>
  );
}
