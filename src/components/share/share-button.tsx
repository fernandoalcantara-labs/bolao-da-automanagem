"use client";

import * as React from "react";
import { Share2, Copy, Link as LinkIcon, MessageCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { shareMessageCompleto } from "@/lib/share-message";
import type { PontuacaoConfig, RateioConfig } from "@/types/database";

export function ShareButton({
  nomeBolao,
  valorArrecadado,
  valorAposta,
  pontuacao,
  rateio,
  pixChave,
  pixNome,
  compact = false,
}: {
  nomeBolao: string;
  valorArrecadado: number;
  valorAposta: number;
  pontuacao: PontuacaoConfig;
  rateio: RateioConfig;
  pixChave: string;
  pixNome: string;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [appUrl, setAppUrl] = React.useState("https://bolao-da-automanagem.vercel.app");
  const [copiouTexto, setCopiouTexto] = React.useState(false);
  const [copiouLink, setCopiouLink] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") setAppUrl(window.location.origin);
  }, []);

  const mensagem = shareMessageCompleto({
    nomeBolao,
    totalArrecadado: valorArrecadado,
    valorAposta,
    appUrl,
    pontuacao,
    rateio,
    pixChave,
    pixNome,
  });

  async function compartilharNativo() {
    if (navigator.share) {
      try {
        await navigator.share({ title: nomeBolao, text: mensagem, url: appUrl });
        return true;
      } catch {
        // usuário cancelou
        return false;
      }
    }
    return false;
  }

  async function copiarTexto() {
    await navigator.clipboard.writeText(mensagem);
    setCopiouTexto(true);
    toast({ title: "Copiado! 🎉", variant: "success" });
    setTimeout(() => setCopiouTexto(false), 2500);
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(appUrl);
    setCopiouLink(true);
    toast({ title: "Link copiado! 🔗", variant: "success" });
    setTimeout(() => setCopiouLink(false), 2500);
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          onClick={async () => {
            // Em mobile com Web Share API, tenta nativo primeiro
            if (await compartilharNativo()) return;
            // Senão, abre o modal
            setOpen(true);
          }}
          className={cn(
            "btn-stack inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-white",
            compact && "px-2",
          )}
          style={{
            background: "#4A9EFF",
            boxShadow: "0 3px 0 #2978CC",
          }}
          aria-label="Compartilhar"
        >
          <Share2 className="h-3.5 w-3.5" />
          {!compact && <span>Compartilhar</span>}
        </button>
      </DialogTrigger>

      <DialogContent>
        <div>
          <DialogTitle>📤 Compartilhar o bolão</DialogTitle>
          <DialogDescription>
            Chama os amigos pra entrar — o prêmio cresce quanto mais gente pagar 💰
          </DialogDescription>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-xl border-2 border-border bg-festive-page/40 p-3 text-sm">
          <p className="whitespace-pre-line font-medium text-foreground">{mensagem}</p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-stack flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold text-white"
            style={{ background: "#25D366", boxShadow: "0 3px 0 #1EA952" }}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <button
            onClick={copiarTexto}
            className="btn-stack flex items-center justify-center gap-1.5 rounded-xl border-2 border-border bg-white py-2.5 text-sm font-extrabold"
          >
            {copiouTexto ? <Check className="h-4 w-4 text-festive-green" /> : <Copy className="h-4 w-4" />}
            {copiouTexto ? "Copiado!" : "Copiar texto"}
          </button>
          <button
            onClick={copiarLink}
            className="btn-stack flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold text-white"
            style={{ background: "#4A9EFF", boxShadow: "0 3px 0 #2978CC" }}
          >
            {copiouLink ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
            {copiouLink ? "Copiado!" : "Copiar link"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
