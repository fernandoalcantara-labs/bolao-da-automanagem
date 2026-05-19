import { AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CopyButton } from "./copy-button";
import { getCurrentUser } from "@/lib/auth-helpers";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PagamentoPage() {
  const supabase = createClient();
  const user = await getCurrentUser();

  const { data: config } = await supabase
    .from("config")
    .select("chave, valor")
    .in("chave", ["pix_chave", "pix_nome", "valor_aposta", "nome_bolao"]);

  const conf = Object.fromEntries((config ?? []).map((c) => [c.chave, c.valor]));
  const pixChave = (conf.pix_chave as string) ?? "—";
  const pixNome = (conf.pix_nome as string) ?? "—";
  const valor = Number(conf.valor_aposta ?? 50);

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-2 sm:py-6">
      <header className="space-y-1">
        <h1 className="font-fredoka text-3xl font-extrabold flex items-center gap-2">
          <Wallet className="h-7 w-7 text-festive-green" /> Pagamento
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Faça um PIX e me avisa pra eu confirmar 💸
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          {/* Valor destaque */}
          <div className="rounded-2xl gradient-gold p-5 text-center shadow-stack-gold">
            <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-900/70">
              Valor da aposta
            </p>
            <p className="mt-1 font-fredoka text-4xl font-extrabold text-zinc-900">
              {formatCurrency(valor)}
            </p>
          </div>

          {/* PIX */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              📋 Chave PIX
            </p>
            <div className="flex items-center gap-2 rounded-xl border-2 border-festive-green/30 bg-festive-green/5 p-3">
              <code className="flex-1 truncate font-mono text-sm font-bold text-foreground">{pixChave}</code>
              <CopyButton value={pixChave} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              👤 Recebedor
            </p>
            <p className="text-base font-extrabold">{pixNome}</p>
          </div>

          {user && user.pago && (
            <div className="rounded-xl border-2 border-festive-green/40 bg-festive-green/10 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-festive-green" />
                <div>
                  <p className="font-extrabold text-festive-green">Tá pago! 💚</p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Você já está no ranking público 🎉
                  </p>
                </div>
              </div>
            </div>
          )}
          {user && !user.pago && (
            <div
              className="flex items-start gap-3 rounded-xl border-2 px-3 py-2.5"
              style={{
                background: "#FFE5DD",
                borderColor: "#FF6B35",
              }}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#FF6B35" }} />
              <div className="space-y-0.5">
                <p className="text-sm font-extrabold" style={{ color: "#A8421A" }}>
                  ⚠️ Falta o PIX! 💸 Acerta com o organizador
                </p>
                <p className="text-xs font-medium" style={{ color: "#A8421A", opacity: 0.85 }}>
                  Sem pagamento confirmado, seu palpite não conta no ranking público.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-xl border-2 border-border bg-festive-page/40 p-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Passo a passo
            </p>
            <ol className="ml-4 list-decimal space-y-1.5 text-sm font-medium">
              <li>Abra o app do seu banco e faça PIX de <strong className="text-festive-green">{formatCurrency(valor)}</strong>.</li>
              <li>Use a chave acima. Confira: <strong>{pixNome}</strong>.</li>
              <li>Envia o comprovante pro organizador (WhatsApp).</li>
              <li>Em até 24h o pagamento é confirmado e seu palpite começa a contar 🎯</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
