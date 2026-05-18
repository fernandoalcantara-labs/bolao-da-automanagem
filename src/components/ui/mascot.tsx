import { cn } from "@/lib/utils";

/**
 * Mascote do Bolão — quadrado amarelo arredondado com bola estilizada,
 * levemente inclinado. Usado no header, favicon e onde precisar de logo.
 */
export function Mascot({
  size = 38,
  className,
  tilted = true,
}: {
  size?: number;
  className?: string;
  tilted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[28%] shadow-md",
        "gradient-gold ring-2 ring-festive-gold-dark/30",
        tilted && "-rotate-6",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <SoccerBall size={Math.round(size * 0.65)} />
    </span>
  );
}

function SoccerBall({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="16" r="14" fill="white" stroke="#1A1A2E" strokeWidth="1.5" />
      <path d="M16 4 L19 9 L16 14 L13 9 Z" fill="#1A1A2E" />
      <path d="M28 14 L23 17 L20 12 L25 9 Z" fill="#1A1A2E" />
      <path d="M4 14 L9 9 L12 12 L9 17 Z" fill="#1A1A2E" />
      <path d="M9 24 L14 20 L18 24 L14 28 Z" fill="#1A1A2E" />
    </svg>
  );
}
