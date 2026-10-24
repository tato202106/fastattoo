"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { BODY_ZONES, STYLES, styleLabel } from "@/lib/styles";
import type { BodyZone, PortfolioItem, StyleSlug } from "@/lib/types";

/** Côté le plus long envoyé au serveur : photos de téléphone allégées avant l'envoi. */
const MAX_SIDE = 2000;

/** Réduit une photo trop lourde dans le navigateur (envoi plus rapide, limite de taille des requêtes). */
async function shrink(file: File): Promise<Blob> {
  if (file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    // Format non lu par le navigateur (HEIC sur certains appareils) : le serveur s'en charge.
    return file;
  }
}

/** Photos du portfolio d'un compte tatoueur : ajout au fur et à mesure, suppression. */
export function PhotosManager({ initial, styles, published }: { initial: PortfolioItem[]; styles: StyleSlug[]; published: boolean }) {
  const [photos, setPhotos] = useState(initial);
  const [style, setStyle] = useState<StyleSlug>(styles[0] ?? "fine-line");
  const [zone, setZone] = useState<BodyZone>("avant-bras");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const styleOptions = [...styles, ...STYLES.map((s) => s.slug).filter((s) => !styles.includes(s))];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    setProgress({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      try {
        const body = new FormData();
        body.append("file", await shrink(file), file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg");
        body.append("style", style);
        body.append("zone", zone);
        body.append("alt", `${styleLabel(style)} – ${BODY_ZONES.find((z) => z.slug === zone)?.label ?? ""}`);
        const res = await fetch("/api/compte/photos", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { photos?: PortfolioItem[]; error?: string };
        if (!res.ok || !data.photos) throw new Error(data.error ?? "Envoi impossible. Réessaie.");
        setPhotos(data.photos);
      } catch (e) {
        setError(`${file.name} : ${(e as Error).message}`);
        break;
      } finally {
        setProgress({ done: i + 1, total: list.length });
      }
    }
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer cette photo de ton profil ?")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/compte/photos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { photos?: PortfolioItem[]; error?: string };
      if (!res.ok || !data.photos) throw new Error(data.error ?? "Suppression impossible.");
      setPhotos(data.photos);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="space-y-4">
      <p className="text-[15px] text-muted">
        {photos.length === 0
          ? published
            ? "Ton profil est déjà en ligne. Ajoute tes réalisations au fur et à mesure : elles apparaissent directement sur ton profil public."
            : "Ajoute tes réalisations au fur et à mesure : elles apparaîtront sur ton profil public."
          : `${photos.length} photo${photos.length > 1 ? "s" : ""} sur ton profil. La plus récente s'affiche en premier.`}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Style
          <select value={style} onChange={(e) => setStyle(e.target.value as StyleSlug)} className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px]">
            {styleOptions.map((s) => (
              <option key={s} value={s}>
                {styleLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Zone
          <select value={zone} onChange={(e) => setZone(e.target.value as BodyZone)} className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px]">
            {BODY_ZONES.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input ref={input} type="file" accept="image/*" multiple className="sr-only" id="ajout-photos" onChange={(e) => upload(e.target.files)} disabled={busy} />
      <label
        htmlFor="ajout-photos"
        aria-disabled={busy}
        className="tap flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent text-[16px] font-semibold text-accent-fg aria-disabled:opacity-70"
      >
        {busy ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            Envoi {Math.min(progress.done + 1, progress.total)} / {progress.total}…
          </>
        ) : (
          <>
            <Icon name="camera" size={20} /> Ajouter des photos
          </>
        )}
      </label>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id} className="relative overflow-hidden rounded-xl">
              <div className="relative aspect-square">
                <Picture image={p} usage="list" fill sizes="33vw" />
              </div>
              <span className="pointer-events-none absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {styleLabel(p.style)}
              </span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={deleting === p.id}
                aria-label="Supprimer cette photo"
                className="tap absolute top-0 right-0 flex size-11 items-start justify-end p-1.5"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                  <Icon name={deleting === p.id ? "clock" : "trash"} size={14} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
