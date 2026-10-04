"use client";

import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

export function FavoriteButton({ artistId, name, className, variant = "plain" }: { artistId: string; name: string; className?: string; variant?: "plain" | "overlay" | "outline" }) {
  const hydrated = useHydrated();
  const isFav = useApp((s) => s.favorites.includes(artistId));
  const toggle = useApp((s) => s.toggleFavorite);
  const active = hydrated && isFav;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Retirer ${name} des favoris` : `Ajouter ${name} aux favoris`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(artistId);
        navigator.vibrate?.(8);
      }}
      className={clsx(
        "tap inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
        variant === "overlay" && "bg-black/35 text-white backdrop-blur-md",
        variant === "outline" && "border border-border bg-surface",
        active ? "text-accent" : variant === "overlay" ? "text-white" : "text-fg",
        className,
      )}
    >
      <Icon name="heart" size={22} filled={active} />
    </button>
  );
}
