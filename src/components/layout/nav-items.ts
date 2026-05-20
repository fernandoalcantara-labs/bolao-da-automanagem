import {
  Home,
  Trophy,
  GitBranch,
  Target,
  Scroll,
  Wallet,
  Settings,
  Download,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Item requer login pra aparecer */
  auth?: boolean;
  /** Item requer role=admin pra aparecer */
  admin?: boolean;
  /** Item entra no bottom-nav mobile. Itens sem `primary` vão pro drawer "Mais". */
  primary?: boolean;
};

// Ordem importa — define a renderização no sidebar e no drawer.
//
// Regra do bottom nav mobile:
// - LOGADO: Painel · Grupos · Mata-mata · Artilheiro · Mais (5 cols)
// - DESLOGADO: Painel · Regras · BORA(CTA) · Mais (4 cols)
//
// O filtro no bottom-nav.tsx pega TODOS os items primary permitidos
// (pelo auth/admin) e faz slice(0, 4). Items que sobrarem fora do
// slice OU não-primary entram no drawer "Mais".
export const NAV_ITEMS: NavItem[] = [
  // PRIMARY (candidatos a bottom nav)
  // Ordem aqui importa pra disputar os 4 slots do slice:
  { href: "/", label: "Painel", icon: Home, primary: true },
  { href: "/palpites/grupos", label: "Grupos", icon: Trophy, auth: true, primary: true },
  { href: "/palpites/mata-mata", label: "Mata-mata", icon: GitBranch, auth: true, primary: true },
  { href: "/palpites/artilheiro", label: "Artilheiro", icon: Target, auth: true, primary: true },
  { href: "/regras", label: "Regras", icon: Scroll, primary: true },

  // SECONDARY (drawer "Mais" mobile + sidebar desktop)
  { href: "/pagamento", label: "Pagamento", icon: Wallet, auth: true },
  { href: "/meus-resultados", label: "Meus Resultados", icon: Download, auth: true },
  { href: "/admin", label: "Admin", icon: Settings, admin: true },
];
