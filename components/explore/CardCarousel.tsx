"use client";

import { useEffect, useRef } from "react";
import { ArtistCompactCard } from "@/components/artist/ArtistCard";
import type { ArtistCard } from "@/lib/types";

/**
 * Carrousel horizontal (scroll-snap) du cran « peek ».
 * Swipe → la carte suit le tatoueur affiché ; tap sur un marqueur → le
 * carrousel se positionne sur la card correspondante (SPEC §8).
 */
export function CardCarousel({ items, selectedId, onActiveChange }: { items: ArtistCard[]; selectedId: string | null; onActiveChange: (id: string) => void }) {
  const ref = useRef<HTMLUListElement>(null);
  const programmatic = useRef(false);
  const lastReported = useRef<string | null>(null);

  // Sélection externe (marqueur) → défilement vers la card.
  useEffect(() => {
    const list = ref.current;
    if (!list || !selectedId || lastReported.current === selectedId) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    const child = list.children[idx] as HTMLElement | undefined;
    if (!child) return;
    programmatic.current = true;
    lastReported.current = selectedId;
    list.scrollTo({ left: child.offsetLeft - list.offsetLeft - 16, behavior: Math.abs(list.scrollLeft - child.offsetLeft) > list.clientWidth * 3 ? "auto" : "smooth" });
    const t = setTimeout(() => (programmatic.current = false), 600);
    return () => clearTimeout(t);
  }, [selectedId, items]);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      if (programmatic.current) return;
      const first = list.children[0] as HTMLElement | undefined;
      if (!first) return;
      const step = first.offsetWidth + 12;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(list.scrollLeft / step)));
      const id = items[idx]?.id;
      if (id && id !== lastReported.current) {
        lastReported.current = id;
        onActiveChange(id);
      }
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, 110);
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      list.removeEventListener("scroll", onScroll);
    };
  }, [items, onActiveChange]);

  if (items.length === 0) return null;

  return (
    <ul
      ref={ref}
      className="scrollbar-none flex h-full touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-3"
      aria-label="Tatoueurs sur la carte"
    >
      {items.map((a) => (
        <li key={a.id} className="w-[calc(100%-28px)] max-w-[420px] shrink-0 snap-center">
          <ArtistCompactCard artist={a} active={a.id === selectedId} />
        </li>
      ))}
    </ul>
  );
}
