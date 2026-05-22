import { cn } from "@/lib/utils";

const SORRISO_URL = "https://share.google/AVyw1Z4DE6Cw2c3uT";

/**
 * Selo "Designed by Sorriso" — canto direito superior.
 */
export function DesignedBySorriso({
  className,
  compact = false,
  shortText = false,
  onLight = false,
}: {
  className?: string;
  /** Só o avatar, sem texto (espaço muito apertado). */
  compact?: boolean;
  /** Texto curto "by Sorriso" em vez de "Designed by Sorriso" — pro
   *  header mobile, onde o nome do bolão divide espaço. */
  shortText?: boolean;
  onLight?: boolean;
}) {
  return (
    <a
      href={SORRISO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-extrabold transition-all hover:scale-105",
        onLight
          ? "border-2 border-festive-gold-dark/30 bg-white text-festive-gold-dark"
          : "border-2 border-white/30 bg-white/15 text-white backdrop-blur",
        compact && "pr-1",
        className,
      )}
      aria-label="Designed by Sorriso — perfil no LinkedIn"
      title="Designed by Sorriso"
    >
      <SorrisoAvatar className="h-6 w-6" />
      {!compact && <span>{shortText ? "by Sorriso" : "Designed by Sorriso"}</span>}
    </a>
  );
}

function SorrisoAvatar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "rounded-full bg-gradient-to-br from-festive-gold to-festive-gold-dark text-zinc-900 shadow-md",
        className,
      )}
      aria-hidden
    >
      <circle cx="9" cy="10" r="1.4" fill="currentColor" />
      <circle cx="15" cy="10" r="1.4" fill="currentColor" />
      <path
        d="M7.5 14.5 Q12 18.5 16.5 14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
