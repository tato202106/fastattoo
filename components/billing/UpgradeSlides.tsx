"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { ANNUAL_PERK, annualSavings, formatPrice, PLANS } from "@/lib/billing/plans";

const s = annualSavings();

/** Contenu des slides : uniquement des faits vérifiables (prix, économies). */
export const UPGRADE_SLIDES = [
  {
    kicker: `Forfait annuel · ${ANNUAL_PERK}`,
    title: `${formatPrice(PLANS.annual.amount)} pour 12 mois`,
    text: `Au lieu de ${formatPrice(s.yearlyMonthlyCost)} en payant chaque mois.`,
    tone: "bg-fg text-bg",
  },
  {
    kicker: `−${s.percent} %`,
    title: `${formatPrice(s.saved)} d'économie`,
    text: `Soit ${formatPrice(s.perMonth)} par mois au lieu de ${formatPrice(PLANS.monthly.amount)}${s.freeMonths >= 1 ? ` : plus de ${s.freeMonths} mois offert${s.freeMonths > 1 ? "s" : ""}` : ""}.`,
    tone: "bg-accent text-accent-fg",
  },
  {
    kicker: "Zéro souci",
    title: "Un seul paiement, toute l'année",
    text: "Profil, portfolio, demandes et calendrier sans interruption pendant 12 mois.",
    tone: "bg-surface-2 text-fg",
  },
] as const;

const AUTOPLAY_MS = 4500;

/**
 * Slides « Passer à l'annuel » : swipe horizontal (scroll-snap), points de
 * navigation, défilement automatique mis en pause au toucher (et désactivé si
 * l'utilisateur a réduit les animations).
 */
export function UpgradeSlides({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % UPGRADE_SLIDES.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Avantages du forfait annuel"
      onPointerDown={() => setPaused(true)}
      onFocus={() => setPaused(true)}
    >
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-3xl"
      >
        {UPGRADE_SLIDES.map((slide, i) => (
          <section
            key={slide.title}
            aria-roledescription="slide"
            aria-label={`${i + 1} sur ${UPGRADE_SLIDES.length}`}
            className={clsx("flex w-full shrink-0 snap-center flex-col justify-end p-5", slide.tone, compact ? "min-h-40" : "min-h-56")}
          >
            <p className="text-xs font-bold tracking-wider uppercase opacity-75">{slide.kicker}</p>
            <h3 className={clsx("font-display mt-1 leading-tight font-bold", compact ? "text-2xl" : "text-[30px]")}>{slide.title}</h3>
            <p className="mt-1.5 text-[15px] leading-snug opacity-85">{slide.text}</p>
          </section>
        ))}
      </div>
      <div className="mt-1 flex justify-center">
        {UPGRADE_SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => {
              setPaused(true);
              goTo(i);
            }}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className="inline-flex h-11 w-8 items-center justify-center"
          >
            <span className={clsx("h-2 rounded-full transition-all", i === index ? "w-5 bg-fg" : "w-2 bg-border")} />
          </button>
        ))}
      </div>
    </div>
  );
}
