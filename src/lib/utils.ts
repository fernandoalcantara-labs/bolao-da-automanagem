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

export const DEADLINE_FASE_GRUPOS = new Date("2026-06-11T20:00:00-04:00"); // Kickoff WC 2026 — México vs Cazaquistão (Estádio Azteca)
