"use client";

import * as React from "react";
import { MessageCircle, AlertCircle } from "lucide-react";

export function WhatsAppSorriso({
  telefoneSorriso,
  nomeUser,
  valorAposta,
}: {
  telefoneSorriso: string | null;
  nomeUser: string;
  valorAposta: number;
}) {
  if (!telefoneSorriso) {
    return (
      <div
        className="flex items-start gap-2 rounded-xl border-2 border-dashed border-festive-orange/40 bg-festive-orange/5 p-3"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-festive-orange" />
        <p className="text-xs font-medium text-festive-orange">
          O organizador ainda não cadastrou o WhatsApp. Avisa ele!
        </p>
      </div>
    );
  }

  const msg = `Oi Sorriso, paguei R$ ${valorAposta} do bolão - ${nomeUser}`;
  const url = `https://wa.me/${telefoneSorriso}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="space-y-1.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-stack flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-extrabold text-white"
        style={{ background: "#25D366", boxShadow: "0 4px 0 #1EA952" }}
      >
        <MessageCircle className="h-5 w-5" />
        Avisar o Sorriso que paguei
      </a>
      <p className="text-center text-[10px] font-bold text-muted-foreground">
        Abre o WhatsApp com mensagem pronta ✨
      </p>
    </div>
  );
}
