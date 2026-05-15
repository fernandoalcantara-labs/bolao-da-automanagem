import Link from "next/link";
import { PoweredByClaudio } from "./powered-by-claudio";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>
          © 2026 Bolão da AutoManagem · Copa do Mundo FIFA 2026 ·{" "}
          <Link href="/pagamento" className="underline hover:text-foreground">
            Como pagar
          </Link>
        </p>
        <PoweredByClaudio />
      </div>
    </footer>
  );
}
