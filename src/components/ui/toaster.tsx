"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive" | "info";
type Toast = { id: string; title: string; description?: string; variant?: ToastVariant };

let listeners: ((toasts: Toast[]) => void)[] = [];
let memoryToasts: Toast[] = [];

function notify() {
  for (const l of listeners) l(memoryToasts);
}

export function toast(t: Omit<Toast, "id">) {
  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  memoryToasts = [...memoryToasts, { ...t, id }];
  notify();
  setTimeout(() => {
    memoryToasts = memoryToasts.filter((x) => x.id !== id);
    notify();
  }, 4500);
}

export function useToast() {
  return { toast };
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-4 sm:left-auto sm:right-4 sm:top-auto sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "animate-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 bg-white p-4 shadow-stack",
            t.variant === "destructive" && "border-festive-red/50",
            t.variant === "success" && "border-festive-green/50",
            t.variant === "info" && "border-festive-blue/50",
            (!t.variant || t.variant === "default") && "border-festive-gold/50",
          )}
        >
          <span className="mt-0.5 shrink-0">
            {t.variant === "destructive" ? (
              <AlertCircle className="h-5 w-5 text-festive-red" />
            ) : t.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-festive-green" />
            ) : (
              <Info className="h-5 w-5 text-festive-blue" />
            )}
          </span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-foreground">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">{t.description}</p>
            )}
          </div>
          <button
            aria-label="Fechar"
            onClick={() => {
              memoryToasts = memoryToasts.filter((x) => x.id !== t.id);
              notify();
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
