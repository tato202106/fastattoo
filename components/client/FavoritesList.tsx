"use client";

import { useEffect, useState } from "react";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ArtistCardSkeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import type { ArtistCard as Card } from "@/lib/types";

/** Favoris : disponibles sans compte (enregistrés sur l'appareil). */
export function FavoritesList() {
  const hydrated = useHydrated();
  const favorites = useApp((s) => s.favorites);
  const [cards, setCards] = useState<Card[] | null>(null);
  const key = favorites.join(",");

  useEffect(() => {
    if (!hydrated) return;
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- liste vide sans requête
      setCards([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/artists/cards?ids=${key}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ cards: Card[] }>)
      .then((d) => setCards(d.cards))
      .catch(() => {});
    return () => ctrl.abort();
  }, [hydrated, key]);

  // On garde l'ordre des favoris, et une card retirée disparaît tout de suite.
  const shown = cards?.filter((c) => favorites.includes(c.id)).sort((a, b) => favorites.indexOf(a.id) - favorites.indexOf(b.id));

  if (shown == null) {
    return (
      <div className="grid gap-3 px-4 md:grid-cols-2 lg:px-0">
        <ArtistCardSkeleton />
        <ArtistCardSkeleton />
      </div>
    );
  }
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 pt-16 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="heart" size={30} />
        </span>
        <h2 className="mt-4 text-xl font-semibold">Pas encore de favoris</h2>
        <p className="mt-1 max-w-xs text-muted">Touche ♡ sur un tatoueur pour le retrouver ici.</p>
        <ButtonLink href="/explorer" size="lg" className="mt-6 w-full max-w-xs">
          Explorer la carte
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="grid gap-3 px-4 md:grid-cols-2 lg:px-0">
      {shown.map((a) => (
        <ArtistCard key={a.id} artist={a} />
      ))}
    </div>
  );
}
