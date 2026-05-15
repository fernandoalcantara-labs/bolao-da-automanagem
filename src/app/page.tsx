import { Suspense } from "react";
import { DashboardPublico } from "@/components/dashboard/dashboard-publico";

// Painel sempre dinâmico — dados sempre frescos do Supabase, evita
// tentativas de pré-render no build (que falhariam sem env vars).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Carregando painel…</div>}>
      <DashboardPublico />
    </Suspense>
  );
}
