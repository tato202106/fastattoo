import type { IconName } from "@/components/ui/Icon";
import type { Role } from "@/lib/store/model";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: "messages" | "requests";
  exact?: boolean;
}

export const CLIENT_NAV: NavItem[] = [
  { href: "/", label: "Accueil", icon: "home", exact: true },
  { href: "/explorer", label: "Explorer", icon: "map" },
  { href: "/favoris", label: "Favoris", icon: "heart" },
  { href: "/messages", label: "Messages", icon: "message", badge: "messages" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export const ARTIST_NAV: NavItem[] = [
  { href: "/pro", label: "Dashboard", icon: "grid", exact: true },
  { href: "/pro/demandes", label: "Demandes", icon: "inbox", badge: "requests" },
  { href: "/pro/calendrier", label: "Calendrier", icon: "calendar" },
  { href: "/messages", label: "Messages", icon: "message", badge: "messages" },
  { href: "/profil", label: "Profil", icon: "user" },
];

export function navFor(role: Role | undefined): NavItem[] {
  return role === "artist" ? ARTIST_NAV : CLIENT_NAV;
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Écrans « immersifs » : pas de barre de navigation (CTA fixe, chat, tunnels). */
export function hidesBottomNav(pathname: string): boolean {
  return (
    /^\/tatoueurs\/[^/]+/.test(pathname) ||
    /^\/messages\/[^/]+/.test(pathname) ||
    /^\/pro\/demandes\/[^/]+/.test(pathname) ||
    pathname.startsWith("/pro/portfolio/ajouter") ||
    pathname.startsWith("/pro/onboarding") ||
    pathname.startsWith("/connexion") ||
    pathname.startsWith("/offline")
  );
}
