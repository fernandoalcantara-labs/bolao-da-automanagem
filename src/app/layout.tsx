import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { DesignedBySorriso } from "@/components/layout/designed-by-sorriso";
import { Toaster } from "@/components/ui/toaster";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bolão da AutoManagem · Copa do Mundo FIFA 2026",
  description:
    "🇧🇷 Bolão entre amigos da Copa do Mundo FIFA 2026. Palpites, ranking ao vivo, prêmios e gráficos.",
  metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Bolão da AutoManagem · Copa do Mundo FIFA 2026",
    description: "🇧🇷 Vamo que vamo! Bolão entre amigos da Copa 2026.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [perfil, configRes, pagosRes] = await Promise.all([
    getCurrentUser(),
    supabase.from("config").select("chave, valor").in("chave", ["nome_bolao", "valor_aposta"]),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("pago", true),
  ]);
  const conf = Object.fromEntries(
    ((configRes.data ?? []) as any[]).map((c: any) => [c.chave, c.valor]),
  );
  const nomeBolao = String(conf.nome_bolao ?? "Bolão da AutoManagem");
  const valorArrecadado = (pagosRes.count ?? 0) * Number(conf.valor_aposta ?? 50);

  const userNav = perfil
    ? {
        id: perfil.id,
        nome: (perfil as any).nome_exibicao ?? perfil.nome,
        role: perfil.role,
      }
    : null;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Sidebar user={userNav} nomeBolao={nomeBolao} valorArrecadado={valorArrecadado} />
        <MobileHeader nomeBolao={nomeBolao} valorArrecadado={valorArrecadado} />
        <div className="fixed right-4 top-4 z-30 hidden lg:block">
          <DesignedBySorriso onLight />
        </div>
        <div className="lg:pl-64">
          <main
            className="container py-4 lg:py-8"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
          >
            {children}
          </main>
        </div>
        <BottomNav user={userNav} nomeBolao={nomeBolao} valorArrecadado={valorArrecadado} />
        <Toaster />
      </body>
    </html>
  );
}
