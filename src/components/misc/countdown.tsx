"use client";

import * as React from "react";
import { Timer } from "lucide-react";

export function Countdown({ target, label = "Deadline" }: { target: Date; label?: string }) {
  // Evita hydration mismatch — só renderiza com valor real após mount
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <Timer className="h-3.5 w-3.5" />
        <span className="tabular-nums">--:--:--</span>
      </div>
    );
  }

  const diff = target.getTime() - now;
  const expired = diff <= 0;

  if (expired) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
        <Timer className="h-3.5 w-3.5" />
        Deadline encerrado — palpites travados
      </div>
    );
  }

  const sec = Math.floor(diff / 1000);
  const dias = Math.floor(sec / 86400);
  const horas = Math.floor((sec % 86400) / 3600);
  const minutos = Math.floor((sec % 3600) / 60);
  const segundos = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
      <Timer className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}:</span>
      <span className="tabular-nums">
        {dias > 0 && `${dias}d `}
        {pad(horas)}:{pad(minutos)}:{pad(segundos)}
      </span>
    </div>
  );
}
