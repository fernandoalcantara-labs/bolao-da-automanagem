import { cn } from "@/lib/utils";

/**
 * Selo "Powered by Claudio" — mantido só na parte inferior (rodapés).
 * Estilo festivo com asterisco Claude em laranja.
 */
export function PoweredByClaudio({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href="https://claude.com/claude-code"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full bg-zinc-900/10 px-2.5 py-1 text-xs font-bold text-festive-orange transition-colors hover:bg-zinc-900/15",
        className,
      )}
      aria-label="Powered by Claudio"
    >
      <ClaudeIcon className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
      {!compact && <span>Powered by Claudio</span>}
    </a>
  );
}

export function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M12 2 L13.4 8.2 L19.5 5.4 L15.6 10.6 L22 12 L15.6 13.4 L19.5 18.6 L13.4 15.8 L12 22 L10.6 15.8 L4.5 18.6 L8.4 13.4 L2 12 L8.4 10.6 L4.5 5.4 L10.6 8.2 Z" />
    </svg>
  );
}
