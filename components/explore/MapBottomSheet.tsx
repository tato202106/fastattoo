"use client";

import clsx from "clsx";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type Snap = "peek" | "half" | "full";
const ORDER: Snap[] = ["peek", "half", "full"];

/**
 * Bottom sheet non modal de l'écran Carte (SPEC §7).
 *
 * - 3 crans : peek (carrousel), mi-hauteur, plein écran ;
 * - glisser la poignée/l'en-tête (ou le contenu tant que le sheet n'est pas
 *   déplié) le déplace, avec inertie : un geste rapide passe au cran suivant ;
 * - plein écran : le contenu défile normalement ; tirer vers le bas quand la
 *   liste est tout en haut referme le sheet (pas de conflit avec le scroll) ;
 * - clavier : la poignée est un bouton (Entrée = cran suivant, ↑/↓).
 */
export function MapBottomSheet({
  snap,
  onSnapChange,
  peekHeight,
  topOffset,
  header,
  peek,
  children,
  onHeightChange,
}: {
  snap: Snap;
  onSnapChange: (s: Snap) => void;
  /** Hauteur visible au cran « peek » (px). */
  peekHeight: number;
  /** Espace laissé en haut au cran « full » (barre de recherche). */
  topOffset: number;
  header: ReactNode;
  /** Contenu affiché au cran peek (carrousel). */
  peek: ReactNode;
  /** Contenu des crans half/full (liste). */
  children: ReactNode;
  /** Hauteur visible actuelle, pour le padding de la carte. */
  onHeightChange?: (visible: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0); // hauteur totale disponible
  const [dragOffset, setDragOffset] = useState<number | null>(null); // hauteur visible pendant un drag
  const drag = useRef<{ startY: number; startVisible: number; samples: { y: number; t: number }[]; active: boolean; pointerId?: number } | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current?.parentElement;
    if (!el) return;
    const update = () => setHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleFor = useCallback(
    (s: Snap) => {
      const max = Math.max(peekHeight, height - topOffset);
      if (s === "peek") return Math.min(peekHeight, max);
      if (s === "half") return Math.min(Math.max(peekHeight + 120, Math.round(height * 0.55)), max);
      return max;
    },
    [height, peekHeight, topOffset],
  );

  const visible = dragOffset ?? visibleFor(snap);

  useEffect(() => {
    if (dragOffset == null && height > 0) onHeightChange?.(visibleFor(snap));
  }, [snap, height, dragOffset, visibleFor, onHeightChange]);

  const release = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.active) {
      setDragOffset(null);
      return;
    }
    const current = d.startVisible + (d.startY - (d.samples[d.samples.length - 1]?.y ?? d.startY));
    // Vitesse (px/ms, positive = vers le haut) sur les ~100 dernières ms.
    const recent = d.samples.filter((s) => s.t > performance.now() - 100);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const velocity = first && last && last.t > first.t ? (first.y - last.y) / (last.t - first.t) : 0;
    let target: Snap;
    if (Math.abs(velocity) > 0.5) {
      // Geste rapide : cran suivant dans le sens du geste.
      const idx = ORDER.indexOf(snap);
      const projected = ORDER.filter((s) => (velocity > 0 ? visibleFor(s) > current : visibleFor(s) < current));
      target = velocity > 0 ? (projected[0] ?? "full") : (projected[projected.length - 1] ?? "peek");
      if (target === snap && idx >= 0) target = ORDER[Math.min(2, Math.max(0, idx + (velocity > 0 ? 1 : -1)))]!;
    } else {
      const projected = current + velocity * 200;
      target = ORDER.reduce((best, s) => (Math.abs(visibleFor(s) - projected) < Math.abs(visibleFor(best) - projected) ? s : best), "peek" as Snap);
    }
    setDragOffset(null);
    onSnapChange(target);
  }, [onSnapChange, snap, visibleFor]);

  const move = useCallback(
    (y: number) => {
      const d = drag.current;
      if (!d) return false;
      if (!d.active && Math.abs(y - d.startY) < 6) return false;
      d.active = true;
      d.samples.push({ y, t: performance.now() });
      if (d.samples.length > 12) d.samples.shift();
      const min = visibleFor("peek") - 40;
      const max = visibleFor("full") + 20;
      setDragOffset(Math.min(max, Math.max(min, d.startVisible + (d.startY - y))));
      return true;
    },
    [visibleFor],
  );

  // Plein écran : « tirer vers le bas » quand la liste est en haut (événements tactiles non passifs).
  useEffect(() => {
    const el = contentRef.current;
    if (!el || snap !== "full") return;
    let startY = 0;
    let engaged = false;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0]!.clientY;
      engaged = false;
    };
    const onMove = (e: TouchEvent) => {
      const y = e.touches[0]!.clientY;
      if (!engaged) {
        if (el.scrollTop <= 0 && y - startY > 6) {
          engaged = true;
          drag.current = { startY, startVisible: visibleFor("full"), samples: [{ y: startY, t: performance.now() }], active: false };
        } else return;
      }
      e.preventDefault();
      move(y);
    };
    const onEnd = () => {
      if (engaged) release();
      engaged = false;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [snap, move, release, visibleFor]);

  const pointerHandlers = {
    onPointerDown(e: React.PointerEvent) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // En plein écran, seul l'en-tête déplace le sheet (le contenu défile).
      if (snap === "full" && contentRef.current?.contains(e.target as Node)) return;
      drag.current = { startY: e.clientY, startVisible: visible, samples: [{ y: e.clientY, t: performance.now() }], active: false, pointerId: e.pointerId };
    },
    onPointerMove(e: React.PointerEvent) {
      const d = drag.current;
      if (!d || d.pointerId !== e.pointerId) return;
      if (move(e.clientY) && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    onPointerUp(e: React.PointerEvent) {
      if (drag.current?.pointerId !== e.pointerId) return;
      const wasActive = drag.current.active;
      release();
      // Empêche le « clic » qui suit un glissement (ouvrirait une card par erreur).
      if (wasActive) {
        const stop = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 50);
      }
    },
    onPointerCancel() {
      drag.current = null;
      setDragOffset(null);
    },
  };

  const next = () => onSnapChange(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length]!);

  return (
    <div
      ref={rootRef}
      className={clsx(
        "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[26px] bg-surface shadow-[0_-8px_30px_rgb(0_0_0/0.16)]",
        dragOffset == null && "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
      )}
      // Hauteur fixe (cran plein écran) + translation : seule la propriété transform est animée (GPU).
      style={{ height: height ? visibleFor("full") : peekHeight, transform: height ? `translateY(${visibleFor("full") - visible}px)` : undefined }}
      {...pointerHandlers}
    >
      <div className="shrink-0 touch-none select-none">
        <button
          type="button"
          onClick={next}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onSnapChange(ORDER[Math.min(2, ORDER.indexOf(snap) + 1)]!);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onSnapChange(ORDER[Math.max(0, ORDER.indexOf(snap) - 1)]!);
            }
          }}
          aria-label={snap === "full" ? "Réduire la liste" : "Agrandir la liste"}
          aria-expanded={snap !== "peek"}
          className="flex h-6 w-full items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </button>
        {header}
      </div>
      <div className={clsx("min-h-0 flex-1", snap === "peek" ? "block" : "hidden")}>{peek}</div>
      <div
        ref={contentRef}
        className={clsx(
          "min-h-0 flex-1 overscroll-contain",
          snap === "peek" ? "hidden" : "block",
          snap === "full" ? "touch-pan-y overflow-y-auto" : "touch-none overflow-hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}
