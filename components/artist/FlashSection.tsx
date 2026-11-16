"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Picture } from "@/components/ui/Picture";
import { canRequestFlash, FLASH_SIZE_LABEL, type Flash } from "@/lib/flashes";

/**
 * Flashs du tatoueur sur son profil : dessins prêts à tatouer, à prix fixe.
 * « Je le veux » ouvre la demande de projet pré-remplie avec le flash.
 * Profils de démo : flashs d'exemple fournis par la page ; vrais tatoueurs :
 * chargés à l'ouverture pour que les statuts (réservé…) soient toujours à jour.
 */
export function FlashSection({ artistId, requestHref, initial, live }: { artistId: string; requestHref: string; initial: Flash[]; live: boolean }) {
  const [flashes, setFlashes] = useState<Flash[]>(initial);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    fetch(`/api/flashs?artiste=${encodeURIComponent(artistId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ flashes: Flash[] }>) : Promise.reject()))
      .then((d) => {
        if (!cancelled) setFlashes(d.flashes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [artistId, live]);

  if (flashes.length === 0) return null;
  const available = flashes.filter(canRequestFlash).length;

  return (
    <section aria-labelledby="flashs" className="mt-8">
      <h2 id="flashs" className="mb-1 flex items-baseline justify-between text-lg font-semibold">
        Flashs disponibles {available > 0 && <span className="text-sm font-normal text-muted">{available} à prendre</span>}
      </h2>
      <p className="mb-3 text-sm text-muted">Des dessins prêts à tatouer, à prix fixe. Choisis-en un, le tatoueur te répond pour fixer la date.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {flashes.map((f) => {
          const open = canRequestFlash(f);
          return (
            <li key={f.id} className="overflow-hidden rounded-2xl bg-surface shadow-card">
              <div className="relative aspect-square bg-surface-2">
                <Picture image={f.image} usage="list" fill sizes="(min-width: 640px) 22vw, 50vw" />
                {f.unique && open && (
                  <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-black">Pièce unique</span>
                )}
                {!open && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black">Réservé</span>
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-semibold">{f.title}</p>
                <p className="text-sm text-muted">
                  <strong className="text-fg">{f.price} €</strong> · {FLASH_SIZE_LABEL[f.size].split(" (")[0]}
                </p>
                {open ? (
                  <Link
                    href={`${requestHref}?flash=${encodeURIComponent(f.id)}`}
                    className="tap mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg"
                  >
                    Je le veux
                  </Link>
                ) : (
                  <p className="mt-2 flex h-10 items-center justify-center text-sm text-muted">Déjà pris</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
