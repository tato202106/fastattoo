"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

/** Encart « Tu es tatoueur ? » en bas de l'accueil (masqué pour un tatoueur connecté). */
export function ArtistPromo() {
  const hydrated = useHydrated();
  const role = useApp((s) => s.session?.role);
  if (hydrated && role === "artist") return null;
  return (
    <Link href="/devenir-tatoueur" className="tap flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] bg-fg p-4 text-bg">
      <Icon name="sparkle" size={24} className="shrink-0" />
      <span className="flex-1">
        <span className="block font-semibold">Tu es tatoueur ou tatoueuse ?</span>
        <span className="block text-sm opacity-80">Reçois des demandes de projets près de chez toi.</span>
      </span>
      <Icon name="chevronRight" size={18} />
    </Link>
  );
}
