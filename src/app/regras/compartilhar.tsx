"use client";

import * as React from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { shareMessageCompleto } from "@/lib/share-message";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";

type Props = {
  nomeBolao: string;
  pontuacao: PontuacaoConfig;
  rateio: RateioConfig;
  valorAposta: number;
  pixChave: string;
  pixNome: string;
  totalArrecadado: number;
};

export function CompartilharRegras(props: Props) {
  const [copied, setCopied] = React.useState(false);
  const [appUrl, setAppUrl] = React.useState("https://bolao-da-automanagem.vercel.app");

  React.useEffect(() => {
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  const texto = shareMessageCompleto({ ...props, appUrl });

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast({
      title: "Texto copiado!",
      description: "Cola no WhatsApp ou onde quiser.",
      variant: "success",
    });
    setTimeout(() => setCopied(false), 2500);
  }

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Regras do Bolão", text: texto, url: appUrl });
      } catch {
        // usuário cancelou
      }
    } else {
      copiar();
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={copiar}>
        {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
      <Button variant="default" size="sm" onClick={compartilhar}>
        <Share2 className="mr-1.5 h-3.5 w-3.5" /> Compartilhar
      </Button>
    </div>
  );
}
