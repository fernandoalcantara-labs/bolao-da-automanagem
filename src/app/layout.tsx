import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";
import { DesignedBySorriso } from "@/components/layout/designed-by-sorriso";
import { Toaster } from "@/components/ui/toaster";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Sidebar />
        <MobileHeader />
        <div className="fixed right-4 top-4 z-30 hidden lg:block">
          <DesignedBySorriso onLight />
        </div>
        {/* Wrapper que reserva espaço pro sidebar fixo no desktop — evita que o
            container interno extrapole a área visível em larguras intermediárias */}
        <div className="lg:pl-64">
          <main
            className="container py-4 lg:py-8"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
          >
            {children}
          </main>
        </div>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
