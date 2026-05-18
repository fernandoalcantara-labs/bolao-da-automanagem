import { cn } from "@/lib/utils";

const SORRISO_URL = "https://share.google/AVyw1Z4DE6Cw2c3uT";

/**
 * Selo "Designed by Sorriso" — canto direito superior.
 * Substitui o Powered by Claudio nesse spot (que agora fica só na parte
 * inferior, no rodapé do sidebar / drawer).
 */
export function DesignedBySorriso({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={SORRISO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 py-1 pl-1 pr-3 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-400/20",
        compact && "pr-1",
        className,
      )}
      aria-label="Designed by Sorriso — perfil no LinkedIn"
      title="Designed by Sorriso"
    >
      <SorrisoAvatar className="h-6 w-6" />
      {!compact && <span>Designed by Sorriso</span>}
    </a>
  );
}

/**
 * Avatar circular com smile — "Sorriso" em português.
 * Pode trocar pelo retrato real depois (via <Image src=... />).
 */
function SorrisoAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-zinc-900 shadow-sm", className)}
      aria-hidden
    >
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <circle cx="15" cy="10" r="1.4" fill="currentColor" />
      <path
        d="M7.5 14.5 Q12 18.5 16.5 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
