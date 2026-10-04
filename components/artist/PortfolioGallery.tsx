"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Picture } from "@/components/ui/Picture";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { splitMasonry } from "@/lib/masonry";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import { styleLabel } from "@/lib/styles";
import type { PortfolioItem } from "@/lib/types";
import { Lightbox } from "./Lightbox";

const BATCH = 8;

/**
 * Portfolio en masonry 2 colonnes (3 sur grand écran), grandes images,
 * chargement progressif par lots, ouverture plein écran au tap (SPEC §13).
 */
export function PortfolioGallery({ artistId, items: serverItems }: { artistId: string; items: PortfolioItem[] }) {
  const hydrated = useHydrated();
  const additions = useApp((s) => s.portfolioAdditions);
  const items = useMemo(() => {
    const local = hydrated ? additions.filter((a) => a.artistId === artistId) : [];
    return [...local, ...serverItems];
  }, [hydrated, additions, artistId, serverItems]);

  const wide = useMediaQuery("(min-width: 1024px)");
  const [visible, setVisible] = useState(BATCH);
  const [open, setOpen] = useState<number | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= items.length) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible((v) => Math.min(items.length, v + BATCH)), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, items.length]);

  const columns = splitMasonry(items.slice(0, visible), wide ? 3 : 2);

  return (
    <>
      <div className="flex gap-2">
        {columns.map((col, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-2">
            {col.map(({ item, index }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpen(index)}
                className="tap group relative block overflow-hidden rounded-2xl"
                aria-label={`Agrandir : ${item.alt || styleLabel(item.style)}`}
              >
                <Picture image={item} usage="profile" priority={index < 2} sizes={wide ? "(min-width: 1280px) 260px, 22vw" : "50vw"} />
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                  {styleLabel(item.style)}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {visible < items.length && (
        <div ref={sentinel} className="mt-2 grid grid-cols-2 gap-2" aria-hidden>
          <div className="skeleton aspect-[4/5] rounded-2xl" />
          <div className="skeleton aspect-[3/4] rounded-2xl" />
        </div>
      )}
      {open != null && <Lightbox items={items} index={open} onClose={() => setOpen(null)} onIndexChange={(i) => setVisible((v) => Math.max(v, i + 2))} />}
    </>
  );
}
