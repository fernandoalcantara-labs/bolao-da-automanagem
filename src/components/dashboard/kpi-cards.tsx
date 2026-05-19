import { Crown, Medal, Award, Turtle } from "lucide-react";
import { cn } from "@/lib/utils";

export type Posicionado = {
  nomes: string[];
  pontos: number;
};

type Props = {
  primeiro: Posicionado | null;
  segundo: Posicionado | null;
  terceiro: Posicionado | null;
  lanterninha: Posicionado | null;
};

type Item = {
  key: "primeiro" | "segundo" | "terceiro" | "lanterninha";
  emoji: string;
  label: string;
  icon: typeof Crown;
  bg: string;
  text: string;
  numero: string;
};

const ITEMS: Item[] = [
  {
    key: "primeiro",
    emoji: "👑",
    label: "Líder",
    icon: Crown,
    bg: "gradient-gold border-festive-gold-dark/40 shadow-stack-gold",
    text: "text-zinc-900",
    numero: "text-zinc-900",
  },
  {
    key: "segundo",
    emoji: "🥈",
    label: "2º lugar",
    icon: Medal,
    bg: "bg-white border-zinc-300 shadow-stack",
    text: "text-foreground",
    numero: "text-zinc-600",
  },
  {
    key: "terceiro",
    emoji: "🥉",
    label: "3º lugar",
    icon: Award,
    bg: "bg-white border-orange-400/40 shadow-stack",
    text: "text-foreground",
    numero: "text-festive-orange",
  },
  {
    key: "lanterninha",
    emoji: "🐢",
    label: "Lanterninha",
    icon: Turtle,
    bg: "bg-white border-festive-green/40 shadow-stack",
    text: "text-foreground",
    numero: "text-festive-green",
  },
];

export function KpiCards(props: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {ITEMS.map((i) => {
        const p = props[i.key];
        const displayName = p?.nomes.length
          ? p.nomes.length === 1
            ? p.nomes[0]
            : `${p.nomes.length} empatados`
          : "—";
        return (
          <div
            key={i.key}
            className={cn(
              "min-w-0 rounded-2xl border-2 p-3 transition-transform hover:-translate-y-0.5 sm:p-4",
              i.bg,
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className={cn("truncate text-[10px] font-extrabold uppercase tracking-widest", i.text, "opacity-70")}>
                {i.label}
              </span>
              <span className="shrink-0 text-xl sm:text-2xl">{i.emoji}</span>
            </div>
            <p
              className={cn("mt-2 truncate font-fredoka text-xl font-extrabold leading-tight sm:text-2xl", i.text)}
              title={p?.nomes.join(", ")}
            >
              {displayName}
            </p>
            <p className={cn("mt-0.5 truncate text-xs font-bold", i.numero, "opacity-80")}>
              {p ? `${p.pontos} pts` : "sem pontos"}
              {p && p.nomes.length > 1 && " 👥"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
