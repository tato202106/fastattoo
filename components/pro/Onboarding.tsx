"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { CITIES } from "@/lib/cities";
import { useApp } from "@/lib/store/app";
import type { ArtistProfileDraft } from "@/lib/store/model";
import { STYLES } from "@/lib/styles";

const DEFAULTS: ArtistProfileDraft = {
  name: "Léa Ink",
  city: "nantes",
  styles: ["fine-line", "floral", "minimaliste"],
  priceFrom: 120,
  bio: "Je dessine des pièces fines et végétales, pensées pour vieillir joliment sur la peau.",
  instagram: "lea.ink",
  onboarded: false,
};

/**
 * Onboarding / profil professionnel en 4 écrans courts.
 * ⚠️ Démo : enregistré sur l'appareil, le profil public reste celui des données de démo.
 */
export function Onboarding() {
  const router = useRouter();
  const saved = useApp((s) => s.artistProfile);
  const save = useApp((s) => s.saveArtistProfile);
  const [step, setStep] = useState(1);
  const [p, setP] = useState<ArtistProfileDraft>(saved ?? DEFAULTS);
  const set = <K extends keyof ArtistProfileDraft>(k: K, v: ArtistProfileDraft[K]) => setP((x) => ({ ...x, [k]: v }));
  const total = 4;
  const valid = [p.name.trim().length > 1 && !!p.city, p.styles.length > 0, p.priceFrom > 0, true][step - 1];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="px-2 pt-[calc(var(--safe-top)+6px)]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => (step > 1 ? setStep(step - 1) : router.back())} aria-label="Retour" className="tap inline-flex size-11 items-center justify-center rounded-full">
            <Icon name={step > 1 ? "back" : "close"} size={22} />
          </button>
          <p className="flex-1 text-sm font-semibold">Profil professionnel</p>
          <span className="pr-3 text-sm font-semibold">
            {step} / {total}
          </span>
        </div>
        <div className="mx-2 mt-2 h-1.5 rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4 pt-6 pb-[calc(110px+var(--safe-bottom))]">
        {step === 1 && (
          <>
            <h1 className="font-display text-[28px] font-bold">Qui es-tu ?</h1>
            <label className="block">
              <span className="text-sm font-medium">Nom d&apos;artiste</span>
              <input value={p.name} onChange={(e) => set("name", e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
            </label>
            <div>
              <p className="text-sm font-medium">Ville</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CITIES.map((c) => (
                  <button key={c.slug} type="button" aria-pressed={p.city === c.slug} onClick={() => set("city", c.slug)} className={clsx("tap h-11 rounded-xl border text-sm font-semibold", p.city === c.slug ? "border-fg bg-fg text-bg" : "border-border bg-surface")}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="font-display text-[28px] font-bold">Tes styles</h1>
            <p className="text-muted">Ils servent à te faire apparaître dans les bonnes recherches.</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => {
                const on = p.styles.includes(s.slug);
                return (
                  <button key={s.slug} type="button" aria-pressed={on} onClick={() => set("styles", on ? p.styles.filter((x) => x !== s.slug) : [...p.styles, s.slug])} className={clsx("tap h-11 rounded-full border px-4 text-sm font-semibold", on ? "border-fg bg-fg text-bg" : "border-border bg-surface")}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="font-display text-[28px] font-bold">Ton prix de départ</h1>
            <label className="flex h-20 items-center gap-2 rounded-2xl border border-border px-4 focus-within:border-fg">
              <input value={p.priceFrom || ""} onChange={(e) => set("priceFrom", Number(e.target.value.replace(/\D/g, "")))} inputMode="numeric" aria-label="Prix de départ" className="w-full bg-transparent text-4xl font-bold outline-none" />
              <span className="text-2xl font-bold text-muted">€</span>
            </label>
            <p className="text-sm text-muted">Affiché « À partir de {p.priceFrom || "…"} € » sur ton profil.</p>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="font-display text-[28px] font-bold">Présente-toi</h1>
            <textarea value={p.bio} onChange={(e) => set("bio", e.target.value.slice(0, 280))} rows={5} className="w-full resize-none rounded-2xl border border-border bg-surface p-3 outline-none focus:border-fg" />
            <label className="flex h-12 items-center gap-1 rounded-xl border border-border bg-surface px-3 focus-within:border-fg">
              <span className="text-muted">@</span>
              <input value={p.instagram} onChange={(e) => set("instagram", e.target.value.replace(/[^\w.]/g, ""))} placeholder="instagram" aria-label="Compte Instagram" className="flex-1 bg-transparent outline-none" />
            </label>
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-xl">
          <Button
            size="lg"
            className="w-full"
            disabled={!valid}
            onClick={() => {
              if (step < total) return setStep(step + 1);
              save({ ...p, onboarded: true });
              router.replace("/pro");
            }}
          >
            {step < total ? "Continuer" : "Enregistrer mon profil"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
