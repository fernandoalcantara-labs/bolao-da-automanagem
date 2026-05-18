import {
  Home,
  Trophy,
  GitBranch,
  Target,
  Scroll,
  Wallet,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  auth?: boolean;
  admin?: boolean;
  primary?: boolean; // aparece na bottom-nav mobile
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Painel", icon: Home, primary: true },
  { href: "/palpites/grupos", label: "Grupos", icon: Trophy, auth: true, primary: true },
  { href: "/palpites/mata-mata", label: "Mata-mata", icon: GitBranch, auth: true, primary: true },
  { href: "/palpites/artilheiro", label: "Artilheiro", icon: Target, auth: true },
  { href: "/regras", label: "Regras", icon: Scroll, primary: true },
  { href: "/pagamento", label: "Pagamento", icon: Wallet },
  { href: "/admin", label: "Admin", icon: Settings, admin: true },
];
