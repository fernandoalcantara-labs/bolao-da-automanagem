import { cn } from "@/lib/utils";

/**
 * Selo "Powered by Claudio" — obrigatório no header de todas as páginas.
 * Renderiza o ícone "asterisco" Claude em laranja + texto.
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
        "group inline-flex items-center gap-1.5 rounded-full border border-claude/30 bg-claude/10 px-2.5 py-1 text-xs font-medium text-claude transition-colors hover:bg-claude/20",
        className,
      )}
      aria-label="Powered by Claudio"
    >
      <ClaudeIcon className="h-3.5 w-3.5 text-claude transition-transform group-hover:rotate-90" />
      {!compact && <span>Powered by Claudio</span>}
    </a>
  );
}

export function ClaudeIcon({ className }: { className?: string }) {
  // Forma estilizada inspirada no asterisco do Claude (Anthropic)
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
