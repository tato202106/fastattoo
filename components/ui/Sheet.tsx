"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/**
 * Bottom sheet modal (filtres, actions, formulaires courts).
 * Mobile : glisse depuis le bas, se ferme en tirant la poignée vers le bas,
 * en touchant le fond ou avec Échap. Desktop (md+) : panneau centré.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  fullHeight = false,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  fullHeight?: boolean;
  className?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startY: number; pointerId: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- montage côté client pour le portail
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        // Piège de focus minimal
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="presentation">
      <div className="animate-fade-in absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          "animate-slide-up relative flex w-full flex-col rounded-t-3xl bg-surface shadow-card outline-none md:max-w-lg md:rounded-3xl",
          fullHeight ? "h-[calc(100dvh-var(--safe-top)-12px)] md:h-[min(760px,90dvh)]" : "max-h-[calc(100dvh-var(--safe-top)-24px)] md:max-h-[85dvh]",
          className,
        )}
        style={{ transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragging ? "none" : "transform 200ms ease" }}
      >
        <div
          className="flex shrink-0 cursor-grab touch-none flex-col items-center px-4 pt-2 md:cursor-auto"
          onPointerDown={(e) => {
            drag.current = { startY: e.clientY, pointerId: e.pointerId };
            setDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setDragY(Math.max(0, e.clientY - drag.current.startY));
          }}
          onPointerUp={() => {
            const shouldClose = dragY > 110;
            drag.current = null;
            setDragging(false);
            setDragY(0);
            if (shouldClose) onClose();
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
            setDragY(0);
          }}
        >
          <span className="mb-1 h-1.5 w-10 rounded-full bg-border md:hidden" aria-hidden />
          <div className="flex w-full items-center justify-between gap-2 py-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="tap -mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2">
              <Icon name="close" size={22} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-4 pt-3 pb-[calc(12px+var(--safe-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
