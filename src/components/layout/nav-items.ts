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
// Regra do bottom nav mobile (CT-18/CT-19 da QW4):
// - 4 slots máximo: 3 itens primary + "Mais"
// - Item primary só aparece se passar pelo filtro de auth/admin
// - Itens não-primary ficam no drawer "Mais" (junto com auth/admin items)
export const NAV_ITEMS: NavItem[] = [
  // PRIMARY (bottom nav mobile)
  { href: "/", label: "Painel", icon: Home, primary: true },
  { href: "/palpites/grupos", label: "Grupos", icon: Trophy, auth: true, primary: true },
  { href: "/palpites/artilheiro", label: "Artilheiro", icon: Target, auth: true, primary: true },

  // SECONDARY (drawer "Mais" mobile + sidebar desktop)
  { href: "/palpites/mata-mata", label: "Mata-mata", icon: GitBranch, auth: true },
  { href: "/pagamento", label: "Pagamento", icon: Wallet, auth: true },
  { href: "/regras", label: "Regras", icon: Scroll },
  { href: "/minha-exportacao", label: "Minha Exportação", icon: Download, auth: true },
  { href: "/admin", label: "Admin", icon: Settings, admin: true },
];
