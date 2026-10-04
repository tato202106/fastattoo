import clsx from "clsx";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { Rating } from "@/components/ui/Rating";
import { relativeDay } from "@/lib/dates";
import { formatDistance } from "@/lib/geo";
import { styleLabel } from "@/lib/styles";
import type { ArtistCard as Card } from "@/lib/types";
import { FavoriteButton } from "./FavoriteButton";

export function ArtistMeta({ artist, className, nowrap, hidePrice }: { artist: Card; className?: string; nowrap?: boolean; hidePrice?: boolean }) {
  const distance = formatDistance(artist.distanceKm);
  return (
    <p className={clsx("flex items-center gap-x-1.5 text-sm text-muted", nowrap ? "flex-nowrap overflow-hidden whitespace-nowrap" : "flex-wrap", className)}>
      <Rating value={artist.rating} className="text-fg" />
      <span aria-hidden>·</span>
      {distance ? <span>{distance}</span> : <span>{artist.city}</span>}
      {!hidePrice && (
        <>
          <span aria-hidden>·</span>
          <span>dès {artist.priceFrom} €</span>
        </>
      )}
    </p>
  );
}

/**
 * Carte riche (liste) : identité + 3 vignettes du portfolio.
 * Sans `onPick`, toute la carte mène au profil. Avec `onPick` (écran Carte),
 * un tap sélectionne le tatoueur et centre la carte ; « Voir » ouvre le profil.
 */
export function ArtistCard({
  artist,
  selected,
  onPick,
  onHover,
  priority,
  headingLevel = 3,
}: {
  artist: Card;
  selected?: boolean;
  onPick?: () => void;
  onHover?: () => void;
  priority?: boolean;
  /** Niveau du titre selon la page (h2 sur l'écran Carte, h3 sous une section). */
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      className={clsx(
        "relative rounded-[var(--radius-card)] bg-surface p-3 shadow-card ring-2 transition-shadow",
        selected ? "ring-fg" : "ring-transparent",
      )}
      data-artist-id={artist.id}
      onMouseEnter={onHover}
    >
      <div className="flex items-center gap-3">
        <Avatar image={artist.avatar} size={48} />
        <div className="min-w-0 flex-1">
          <H className="flex items-center gap-1 truncate text-[17px] font-semibold">
            {onPick ? (
              <button type="button" onClick={onPick} className="truncate text-left after:absolute after:inset-0 after:content-['']" aria-label={`${artist.name} : centrer sur la carte`}>
                {artist.name}
              </button>
            ) : (
              <Link href={`/tatoueurs/${artist.slug}`} className="truncate after:absolute after:inset-0 after:content-['']">
                {artist.name}
              </Link>
            )}
            {artist.verified && <Icon name="verified" size={16} className="shrink-0 text-accent" aria-label="Vérifié" />}
          </H>
          <ArtistMeta artist={artist} />
        </div>
        {onPick ? (
          <Link href={`/tatoueurs/${artist.slug}`} className="tap relative z-10 inline-flex h-10 items-center rounded-full bg-fg px-4 text-sm font-semibold text-bg">
            Voir
          </Link>
        ) : (
          <FavoriteButton artistId={artist.id} name={artist.name} className="relative z-10 -mr-1" />
        )}
      </div>
      <p className="mt-1.5 truncate text-sm text-fg/80">{artist.styles.map(styleLabel).join(" · ")}</p>
      {artist.previews.length > 0 && (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {artist.previews.map((img) => (
            <div key={img.id} className="relative aspect-[4/5] overflow-hidden rounded-xl">
              <Picture image={img} usage="list" fill priority={priority} />
            </div>
          ))}
        </div>
      )}
      {artist.nextSlot && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
          <Icon name="clock" size={14} />
          Dispo {relativeDay(artist.nextSlot.date).toLowerCase()} à {artist.nextSlot.time.replace(":", "h")}
        </p>
      )}
    </article>
  );
}

/** Carte compacte : carrousel du bottom sheet sur la carte (SPEC §6). */
export function ArtistCompactCard({ artist, active }: { artist: Card; active?: boolean }) {
  return (
    <article className={clsx("relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-3 shadow-card ring-2", active ? "ring-fg" : "ring-transparent")}>
      <div className="flex items-center gap-3">
        <Avatar image={artist.avatar} size={52} />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1 text-[17px] font-semibold">
            <span className="truncate">{artist.name}</span>
            {artist.verified && <Icon name="verified" size={16} className="shrink-0 text-accent" aria-label="Vérifiée" />}
          </h2>
          <ArtistMeta artist={artist} nowrap hidePrice />
          <p className="truncate text-sm text-fg/80">
            {artist.styles.map(styleLabel).join(" · ")} · dès {artist.priceFrom} €
          </p>
        </div>
        <FavoriteButton artistId={artist.id} name={artist.name} className="relative z-10 -mr-1 self-start" />
      </div>
      <Link
        href={`/tatoueurs/${artist.slug}`}
        className="tap mt-3 inline-flex h-11 items-center justify-center rounded-full bg-fg text-[15px] font-semibold text-bg"
      >
        Voir le profil
      </Link>
    </article>
  );
}
