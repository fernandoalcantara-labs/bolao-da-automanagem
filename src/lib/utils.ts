import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatarDataJogo } from "./datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * @deprecated Use `formatarDataJogo(date, "completo")` from `@/lib/datetime`.
 * Mantido como alias por compatibilidade.
 */
export function formatDateTime(date: string | Date) {
  return formatarDataJogo(date, "completo");
}

/**
 * @deprecated Use `formatarDataJogo(date, "apenas_hora")` from `@/lib/datetime`.
 * Mantido como alias por compatibilidade.
 */
export function formatTime(date: string | Date) {
  return formatarDataJogo(date, "apenas_hora");
}

// Kickoff oficial Copa do Mundo FIFA 2026 — México vs ? (Estádio Azteca, CDMX).
// Sites brasileiros (Globo, Google) mostram 16:00 BRT como horário de início.
// Antes estava como "2026-06-11T20:00:00-04:00" assumindo CDT (DST), mas o
// México REVOGOU o horário de verão em 2022 — está em UTC-6 permanente.
// 16:00 BRT (UTC-3) = 19:00 UTC = 13:00 CDMX (UTC-6) ✓
export const DEADLINE_FASE_GRUPOS = new Date("2026-06-11T16:00:00-03:00");
