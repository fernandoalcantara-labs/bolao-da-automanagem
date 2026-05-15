import { Copy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pagamento · {String(conf.nome_bolao ?? "Bolão da AutoManagem")}
          </CardTitle>
          <CardDescription>
            Faça um PIX no valor abaixo para o organizador. Depois, ele marca seu pagamento como aprovado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Valor da aposta</span>
              <span className="text-3xl font-bold text-primary">{formatCurrency(valor)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Chave PIX</p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
              <code className="flex-1 truncate font-mono text-sm">{pixChave}</code>
              <CopyButton value={pixChave} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Recebedor</p>
            <p className="text-base font-medium">{pixNome}</p>
          </div>

          {user && (
            <div className="rounded-lg border border-border bg-card/40 p-4">
              <div className="flex items-center gap-3">
                {user.pago ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="font-medium">Pagamento confirmado!</p>
                      <p className="text-xs text-muted-foreground">
                        Você já está no ranking público.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Badge variant="warning">Aguardando confirmação</Badge>
                    <p className="text-xs text-muted-foreground">
                      O organizador confirma manualmente — seu palpite só aparece no ranking público após isso.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          <ol className="ml-4 list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Abra o app do seu banco e faça PIX no valor de <strong>{formatCurrency(valor)}</strong>.</li>
            <li>Cole a chave acima. Confirme o nome do recebedor: <strong>{pixNome}</strong>.</li>
            <li>Envie o comprovante para o organizador (WhatsApp).</li>
            <li>Em até 24h seu pagamento é confirmado e seu palpite passa a contar no ranking público.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
