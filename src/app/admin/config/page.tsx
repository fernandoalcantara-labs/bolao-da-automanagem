import { requireAdmin } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { ConfigForm } from "./config-form";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  await requireAdmin();
  const supabase = createClient();
  const { data: config } = await supabase.from("config").select("chave, valor");
  const conf = Object.fromEntries((config ?? []).map((c) => [c.chave, c.valor]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>Pontuação, rateio, PIX e valor da aposta.</CardDescription>
        </CardHeader>
      </Card>
      <ConfigForm conf={conf as any} />
    </div>
  );
}
