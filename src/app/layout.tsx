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
    "Bolão entre amigos da Copa do Mundo FIFA 2026 (EUA, Canadá e México). Palpites, ranking ao vivo e gráficos.",
  metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className="gradient-stadium min-h-screen font-sans antialiased">
        {/* Sidebar fixo no desktop */}
        <Sidebar />
        {/* Header simplificado no mobile */}
        <MobileHeader />
        {/* Designed by Sorriso — canto direito superior, só desktop (no mobile já está no MobileHeader) */}
        <div className="fixed right-4 top-4 z-30 hidden lg:block">
          <DesignedBySorriso />
        </div>
        {/* Main com padding-left no desktop pra não ficar atrás do sidebar e padding-bottom no mobile pra não ficar atrás do bottom-nav */}
        <main
          className="container py-6 lg:ml-60 lg:py-10"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
        >
          {children}
        </main>
        {/* Bottom nav fixo no mobile */}
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
