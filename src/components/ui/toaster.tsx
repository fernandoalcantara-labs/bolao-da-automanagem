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
    <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex w-80 animate-fade-in items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xl",
            t.variant === "destructive" && "border-destructive/40",
            t.variant === "success" && "border-emerald-500/40",
            t.variant === "info" && "border-blue-500/40",
          )}
        >
          <span className="mt-0.5 text-muted-foreground">
            {t.variant === "destructive" ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : t.variant === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Info className="h-4 w-4 text-blue-400" />
            )}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
            )}
          </div>
          <button
            aria-label="Fechar"
            onClick={() => {
              memoryToasts = memoryToasts.filter((x) => x.id !== t.id);
              notify();
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
