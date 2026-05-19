"use client";

import * as React from "react";
import Link from "next/link";
import { Target, Wallet, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PendenciasProps = {
  palpitesFeitos: number; // contagem total (grupos + mata + artilheiro)
  palpitesEsperados: number; // total que daria pra fazer
  pago: boolean;
  nomeUser?: string;
  /** "painel" mostra os 2 banners completos com botões.
   *  "pagamento" oculta banner de palpites (já está no painel) e remove
   *  o botão Pagar do banner de pagamento (já estamos na tela). */
  contexto?: "painel" | "pagamento";
};

const STORAGE_KEY_DISMISS = "banner-tudo-certo-dismissed";

export function BannersPendencia({
  palpitesFeitos,
  palpitesEsperados,
  pago,
  contexto = "painel",
}: PendenciasProps) {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const v = window.localStorage.getItem(STORAGE_KEY_DISMISS);
    if (v === today) setDismissed(true);
  }, []);

  // Em /pagamento, escondemos o banner de palpites (foco é só o PIX)
  const palpitesIncompletos =
    contexto !== "pagamento" && palpitesFeitos < palpitesEsperados;
  const pct = palpitesEsperados > 0
    ? Math.round((palpitesFeitos / palpitesEsperados) * 100)
    : 0;
  const tudoCerto = !palpitesIncompletos && pago;

  if (tudoCerto && dismissed) return null;
  if (tudoCerto && contexto === "pagamento") return null;

  if (tudoCerto) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-festive-green bg-festive-green/10 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-festive-green">
          <CheckCircle2 className="h-4 w-4" />
          Tudo certo! Bora torcer 🇧🇷
        </div>
        <button
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            window.localStorage.setItem(STORAGE_KEY_DISMISS, today);
            setDismissed(true);
          }}
          className="text-festive-green/60 hover:text-festive-green"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2.5",
        palpitesIncompletos && !pago && "sm:grid-cols-2",
      )}
    >
      {palpitesIncompletos && <BannerPalpites palpitesFeitos={palpitesFeitos} palpitesEsperados={palpitesEsperados} pct={pct} />}
      {!pago && <BannerPagamento mostrarCta={contexto !== "pagamento"} />}
    </div>
  );
}

function BannerPalpites({
  palpitesFeitos,
  palpitesEsperados,
  pct,
}: {
  palpitesFeitos: number;
  palpitesEsperados: number;
  pct: number;
}) {
  return (
    <Link
      href="/palpites/grupos"
      className="flex flex-col gap-2 rounded-2xl border-2 px-3.5 py-3 transition-transform hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #FFF3CD, #FFE69C)",
        borderColor: "#FF9F1C",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎯</span>
        <div className="flex-1">
          <p className="text-sm font-extrabold" style={{ color: "#92580A" }}>
            Pendente: lançar palpites
          </p>
          <p className="text-xs font-bold" style={{ color: "#92580A", opacity: 0.85 }}>
            {palpitesFeitos} de {palpitesEsperados} palpites preenchidos
          </p>
        </div>
        <span
          className="rounded-md px-2.5 py-1.5 text-xs font-extrabold text-white shadow-stack-orange"
          style={{ background: "#FF9F1C" }}
        >
          Chutar →
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full" style={{ background: "rgba(146,88,10,0.15)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #FF9F1C, #FFD60A)",
          }}
        />
      </div>
      <p className="text-right text-[10px] font-extrabold" style={{ color: "#92580A" }}>
        {pct}% completo
      </p>
    </Link>
  );
}

function BannerPagamento({ mostrarCta = true }: { mostrarCta?: boolean }) {
  const conteudo = (
    <>
      <span className="text-2xl">💸</span>
      <div className="flex-1">
        <p className="text-sm font-extrabold" style={{ color: "#A8421A" }}>
          Pendente: pagar a aposta
        </p>
        <p className="text-xs font-bold" style={{ color: "#A8421A", opacity: 0.85 }}>
          Sem pagamento você não entra no ranking
        </p>
      </div>
      {mostrarCta && (
        <span
          className="rounded-md px-2.5 py-1.5 text-xs font-extrabold text-white"
          style={{ background: "#FF6B35", boxShadow: "0 2px 0 #C44A1F" }}
        >
          Pagar →
        </span>
      )}
    </>
  );
  if (!mostrarCta) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3"
        style={{
          background: "linear-gradient(135deg, #FFE5DD, #FFC9B4)",
          borderColor: "#FF6B35",
        }}
      >
        {conteudo}
      </div>
    );
  }
  return (
    <Link
      href="/pagamento"
      className="flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 transition-transform hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #FFE5DD, #FFC9B4)",
        borderColor: "#FF6B35",
      }}
    >
      {conteudo}
    </Link>
  );
}
