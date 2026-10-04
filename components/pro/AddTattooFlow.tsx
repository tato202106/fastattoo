"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { BODY_ZONES, STYLES } from "@/lib/styles";
import type { BodyZone, ImageAsset, StyleSlug } from "@/lib/types";
import { uploadImage } from "@/lib/upload";

const ARTIST_STYLES: StyleSlug[] = ["fine-line", "floral", "minimaliste"];

/**
 * Ajout au portfolio en moins d'une minute (SPEC §21) :
 * photo (appareil ou galerie) → l'envoi démarre tout de suite en arrière-plan
 * pendant qu'on choisit le style et la zone → Publier.
 */
export function AddTattooFlow() {
  const router = useRouter();
  const session = useApp((s) => s.session);
  const add = useApp((s) => s.addPortfolioItem);
  const profile = useApp((s) => s.artistProfile);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [asset, setAsset] = useState<ImageAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<StyleSlug | null>(null);
  const [zone, setZone] = useState<BodyZone | null>(null);
  const [startedAt] = useState(() => Date.now());

  const preferred = profile?.styles.length ? profile.styles : ARTIST_STYLES;
  const styles = [...STYLES].sort((a, b) => Number(preferred.includes(b.slug)) - Number(preferred.includes(a.slug)));

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setAsset(null);
    setPreview(URL.createObjectURL(file));
    uploadImage(file, "Tatouage")
      .then(setAsset)
      .catch((e: Error) => setError(e.message));
  };

  const publish = () => {
    if (!asset || !style || !zone || !session) return;
    add({ ...asset, alt: `Tatouage ${STYLES.find((s) => s.slug === style)?.label} par ${session.name}`, style, zone, artistId: session.userId, addedAt: Date.now() });
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    router.replace(`/pro/portfolio?publie=${seconds}`);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center gap-2 px-2 pt-[calc(var(--safe-top)+6px)] pb-2">
        <button type="button" onClick={() => router.back()} aria-label="Annuler" className="tap inline-flex size-11 items-center justify-center rounded-full">
          <Icon name="close" size={22} />
        </button>
        <h1 className="flex-1 text-lg font-semibold">Ajouter un tatouage</h1>
      </header>

      <main className="flex-1 space-y-6 px-4 pb-[calc(110px+var(--safe-bottom))]">
        {!preview ? (
          <div className="grid gap-3 pt-6">
            <button type="button" onClick={() => cameraRef.current?.click()} className="tap flex h-36 flex-col items-center justify-center gap-2 rounded-3xl bg-fg text-bg">
              <Icon name="camera" size={34} />
              <span className="text-lg font-semibold">1. Prendre une photo</span>
            </button>
            <button type="button" onClick={() => galleryRef.current?.click()} className="tap flex h-36 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-border bg-surface">
              <Icon name="image" size={34} />
              <span className="text-lg font-semibold">2. Choisir une photo</span>
            </button>
            <p className="text-center text-sm text-muted">Astuce : lumière naturelle, tatouage bien net et cadré.</p>
          </div>
        ) : (
          <>
            <div className="relative mx-auto aspect-[4/5] max-h-[42dvh] overflow-hidden rounded-3xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) avant upload */}
              <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
              <span className={clsx("absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", asset ? "bg-success text-white" : "bg-black/60 text-white")}>
                {asset ? <Icon name="check" size={14} /> : <span className="size-2 animate-pulse rounded-full bg-white" />}
                {asset ? "Photo prête" : error ? "Échec" : "Optimisation…"}
              </span>
              <button type="button" onClick={() => galleryRef.current?.click()} className="absolute top-2 right-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
                Changer
              </button>
            </div>
            {error && <p className="text-sm text-accent">{error}</p>}

            <section>
              <h2 className="mb-2 font-semibold">3. Style</h2>
              <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
                {styles.map((s) => (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={style === s.slug}
                    onClick={() => setStyle(s.slug)}
                    className={clsx("tap h-11 shrink-0 rounded-full border px-4 text-sm font-semibold", style === s.slug ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-2 font-semibold">4. Zone du corps</h2>
              <div className="grid grid-cols-3 gap-2">
                {BODY_ZONES.map((z) => (
                  <button
                    key={z.slug}
                    type="button"
                    aria-pressed={zone === z.slug}
                    onClick={() => setZone(z.slug)}
                    className={clsx("tap h-11 rounded-xl border text-sm font-semibold", zone === z.slug ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </main>

      {preview && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md">
          <div className="mx-auto max-w-xl">
            <Button size="lg" className="w-full" disabled={!asset || !style || !zone} onClick={publish}>
              5. Publier
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
