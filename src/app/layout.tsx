import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
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
        <Header />
        <main className="container py-6 sm:py-10">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
