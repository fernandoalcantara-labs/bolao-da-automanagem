import { cn } from "@/lib/utils";

export type Conquista = "cravador" | "sequencia" | "lider" | "azarao" | "subiu";

const CONFIG: Record<
  Conquista,
  { emoji: string; label: string; cor: string; titulo: string }
> = {
  cravador: {
    emoji: "🎯",
    label: "Cravador",
    cor: "bg-festive-green/15 text-festive-green border-festive-green/30",
    titulo: "Acertou placar exato em 3+ jogos",
  },
  sequencia: {
    emoji: "🔥",
    label: "Sequência",
    cor: "bg-festive-orange/15 text-festive-orange border-festive-orange/40",
    titulo: "Acertou 3 jogos seguidos",
  },
  lider: {
    emoji: "👑",
    label: "Líder",
    cor: "bg-festive-gold/20 text-festive-gold-dark border-festive-gold/50",
    titulo: "Está em 1º lugar",
  },
  azarao: {
    emoji: "🎰",
    label: "Azarão",
    cor: "bg-festive-purple/15 text-festive-purple border-festive-purple/40",
    titulo: "Último colocado mas com pelo menos 1 placar exato",
  },
  subiu: {
    emoji: "⚡",
    label: "Subiu",
    cor: "bg-festive-blue/15 text-festive-blue border-festive-blue/40",
    titulo: "Subiu 5+ posições na última rodada",
  },
};

export function BadgeConquista({
  tipo,
  className,
}: {
  tipo: Conquista;
  className?: string;
}) {
  const c = CONFIG[tipo];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-festive px-2 py-0.5 text-[10px] font-bold",
        c.cor,
        className,
      )}
      title={c.titulo}
    >
      <span>{c.emoji}</span>
      {c.label}
    </span>
  );
}
