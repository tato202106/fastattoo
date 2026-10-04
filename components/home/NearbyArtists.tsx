"use client";

import { useEffect, useState } from "react";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ArtistCardSkeleton } from "@/components/ui/Skeleton";
import { DEFAULT_FILTERS } from "@/lib/search/filters";
import { fetchSearch } from "@/lib/search/client";
import { GEO_MESSAGES, geolocationAlreadyGranted, useLocation } from "@/lib/store/location";
import type { ArtistCard as Card } from "@/lib/types";

/**
 * « Tatoueurs autour de toi » : rendu serveur avec les mieux notés, puis
 * remplacé par les plus proches dès que la position est connue.
 */
export function NearbyArtists({ initial }: { initial: Card[] }) {
  const { position, status, request } = useLocation();
  const [nearby, setNearby] = useState<{ items: Card[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pas de demande d'autorisation surprise : seulement si déjà accordée.
    if (position) return;
    void geolocationAlreadyGranted().then((ok) => {
      if (ok) void request();
    });
  }, [position, request]);

  useEffect(() => {
    if (!position) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état de chargement de la requête
    setLoading(true);
    fetchSearch({ center: position, filters: { ...DEFAULT_FILTERS, radiusKm: 10 }, pageSize: 4 }, ctrl.signal)
      .then((r) => setNearby({ items: r.items, total: r.total }))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [position]);

  const items = nearby && nearby.items.length > 0 ? nearby.items : initial;
  const geoError = status === "denied" || status === "unavailable" || status === "timeout" || status === "error" ? GEO_MESSAGES[status] : null;

  return (
    <section aria-labelledby="nearby-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="nearby-title" className="text-xl font-semibold">
            Tatoueurs autour de toi
          </h2>
          <p className="text-sm text-muted" aria-live="polite">
            {nearby
              ? nearby.total > 0
                ? `${nearby.total} tatoueur${nearby.total > 1 ? "s" : ""} à moins de 10 km`
                : "Aucun tatoueur à moins de 10 km — voici les mieux notés"
              : "Les mieux notés en ce moment"}
          </p>
        </div>
      </div>

      {!position && (
        <button
          type="button"
          onClick={() => void request()}
          disabled={status === "locating"}
          className="tap mb-3 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-accent-soft px-4 text-left text-accent"
        >
          <Icon name="locate" size={22} />
          <span className="flex-1 text-[15px] font-semibold">{status === "locating" ? "Localisation…" : "Utiliser ma position"}</span>
          <Icon name="chevronRight" size={18} />
        </button>
      )}
      {geoError && <p className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">{geoError}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {loading ? [0, 1, 2].map((i) => <ArtistCardSkeleton key={i} />) : items.map((a, i) => <ArtistCard key={a.id} artist={a} priority={i === 0} />)}
      </div>

      <ButtonLink href="/explorer" variant="outline" size="lg" className="mt-4 w-full">
        <Icon name="map" size={20} />
        Voir la carte
      </ButtonLink>
    </section>
  );
}
