"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { styleLabel, zoneLabel } from "@/lib/styles";
import type { PortfolioItem } from "@/lib/types";

/**
 * Plein écran (SPEC §13) : swipe horizontal natif (scroll-snap), swipe vers le
 * bas pour fermer, préchargement des voisines, flèches/Échap au clavier,
 * bouton « retour » du téléphone pour fermer (entrée d'historique dédiée).
 */
export function Lightbox({ items, index, onClose, onIndexChange }: { items: PortfolioItem[]; index: number; onClose: () => void; onIndexChange: (i: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(index);
  const [dragY, setDragY] = useState(0);
  const touch = useRef<{ x: number; y: number; mode: "none" | "vertical" | "horizontal" } | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Position initiale + verrouillage du scroll de la page.
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = index * track.clientWidth;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement à l'ouverture
  }, []);

  // Bouton retour Android/iOS = fermer.
  useEffect(() => {
    history.pushState({ lightbox: true }, "");
    const onPop = () => closeRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const close = () => {
    if (history.state?.lightbox) history.back();
    else onClose();
  };

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== current) {
      setCurrent(i);
      onIndexChange(i);
    }
  };

  const item = items[current];
  const opacity = Math.max(0.2, 1 - dragY / 400);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col text-white" role="dialog" aria-modal="true" aria-label="Portfolio en plein écran" style={{ backgroundColor: `rgb(0 0 0 / ${opacity})` }}>
      <div className="flex items-center justify-between px-2 pt-[calc(var(--safe-top)+4px)]" style={{ opacity }}>
        <button type="button" onClick={close} aria-label="Fermer" className="tap inline-flex size-11 items-center justify-center rounded-full bg-white/10">
          <Icon name="close" size={22} />
        </button>
        <span className="text-sm font-medium tabular-nums" aria-live="polite">
          {current + 1} / {items.length}
        </span>
        <span className="size-11" />
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={(e) => {
          const t = e.touches[0]!;
          touch.current = { x: t.clientX, y: t.clientY, mode: "none" };
        }}
        onTouchMove={(e) => {
          const s = touch.current;
          if (!s) return;
          const t = e.touches[0]!;
          const dx = t.clientX - s.x;
          const dy = t.clientY - s.y;
          if (s.mode === "none" && Math.hypot(dx, dy) > 8) s.mode = Math.abs(dy) > Math.abs(dx) && dy > 0 ? "vertical" : "horizontal";
          if (s.mode === "vertical") setDragY(Math.max(0, dy));
        }}
        onTouchEnd={() => {
          if (touch.current?.mode === "vertical" && dragY > 120) close();
          else setDragY(0);
          touch.current = null;
        }}
        className="scrollbar-none flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-contain"
        style={{ touchAction: dragY > 0 ? "none" : "pan-x" }}
      >
        {items.map((it, i) => (
          <div key={it.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center px-2" aria-hidden={i !== current}>
            {/* Seules l'image courante et ses voisines sont chargées (préchargement). */}
            {Math.abs(i - current) <= 1 ? (
              <div
                className="max-h-full w-full transition-transform duration-75"
                style={{ maxWidth: `min(100%, calc((100dvh - 160px) * ${it.width / it.height}))`, transform: i === current && dragY ? `translateY(${dragY}px) scale(${1 - dragY / 2000})` : undefined }}
              >
                <Picture image={it} usage="fullscreen" sizes="100vw" priority={i === current} className="rounded-lg" draggable={false} />
              </div>
            ) : (
              <div className="aspect-[4/5] w-full rounded-lg" style={{ backgroundColor: it.color, opacity: 0.2 }} />
            )}
          </div>
        ))}
      </div>

      {item && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+14px)]" style={{ opacity }}>
          <p className="text-sm">
            <span className="font-semibold">{styleLabel(item.style)}</span>
            <span className="opacity-70"> · {zoneLabel(item.zone)}</span>
          </p>
          <div className="hidden gap-2 md:flex">
            <button type="button" onClick={() => goTo(current - 1)} aria-label="Précédent" className="inline-flex size-11 items-center justify-center rounded-full bg-white/10">
              <Icon name="back" size={20} />
            </button>
            <button type="button" onClick={() => goTo(current + 1)} aria-label="Suivant" className="inline-flex size-11 items-center justify-center rounded-full bg-white/10">
              <Icon name="chevronRight" size={20} />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
