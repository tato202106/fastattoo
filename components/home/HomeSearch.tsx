"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { SearchAction } from "@/components/explore/SearchOverlay";

/** Recherche plein écran chargée à la première ouverture (hors du bundle initial). */
const SearchOverlay = dynamic(() => import("@/components/explore/SearchOverlay").then((m) => m.SearchOverlay), { ssr: false });
const preloadSearch = () => void import("@/components/explore/SearchOverlay");
import { Icon } from "@/components/ui/Icon";

/** Grande barre de recherche + bouton « Autour de moi » (SPEC §5). */
export function HomeSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const onAction = useCallback(
    (a: SearchAction) => {
      setOpen(false);
      if (a.type === "artist") router.push(`/tatoueurs/${a.slug}`);
      else if (a.type === "nearby") router.push("/explorer?autour=1");
      else router.push(a.q ? `/explorer?q=${encodeURIComponent(a.q)}` : "/explorer");
    },
    [router],
  );

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerDown={preloadSearch}
        onMouseEnter={() => {
          preloadSearch();
          router.prefetch("/explorer");
        }}
        className="tap flex h-14 w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-left shadow-card"
        aria-label="Rechercher : ville, style ou tatoueur"
      >
        <Icon name="search" size={22} />
        <span className="text-[16px] text-muted">Ville, style ou tatoueur</span>
      </button>
      <button
        type="button"
        onClick={() => onAction({ type: "nearby" })}
        className="tap inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-fg text-[15px] font-semibold text-bg"
      >
        <Icon name="locate" size={20} />
        Autour de moi
      </button>
      {open && <SearchOverlay open={open} onClose={close} onAction={onAction} />}
    </div>
  );
}
