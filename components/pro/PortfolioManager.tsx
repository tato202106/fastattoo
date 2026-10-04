"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/account/LoginGate";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { useApp } from "@/lib/store/app";
import { DEMO_ARTIST_SLUG } from "@/lib/store/ids";
import { styleLabel } from "@/lib/styles";
import type { Artist, PortfolioItem } from "@/lib/types";

export function PortfolioManager() {
  const session = useApp((s) => s.session);
  const additions = useApp((s) => s.portfolioAdditions);
  const remove = useApp((s) => s.removePortfolioItem);
  const [published, setPublished] = useState<PortfolioItem[] | null>(null);
  const mine = additions.filter((a) => a.artistId === session?.userId);

  useEffect(() => {
    fetch(`/api/artists/${DEMO_ARTIST_SLUG}`)
      .then((r) => r.json() as Promise<Artist>)
      .then((a) => setPublished(a.portfolio))
      .catch(() => setPublished([]));
  }, []);

  return (
    <>
      <PageHeader
        title="Portfolio"
        action={
          <Link href={`/tatoueurs/${DEMO_ARTIST_SLUG}`} className="text-sm font-semibold text-accent">
            Voir mon profil
          </Link>
        }
      />
      <div className="px-4 lg:px-0">
        <Link href="/pro/portfolio/ajouter" className={buttonClass("primary", "lg", "w-full")}>
          <Icon name="plus" size={22} /> Ajouter un tatouage
        </Link>
        <p className="mt-2 text-center text-xs text-muted">{(published?.length ?? 0) + mine.length} créations publiées</p>
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {mine.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl">
              <Picture image={p} usage="list" fill sizes="33vw" />
              <span className="absolute top-1 left-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-fg">Nouveau</span>
              <button type="button" aria-label="Supprimer" onClick={() => confirm("Retirer ce tatouage du portfolio ?") && remove(p.id)} className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white">
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
          {published == null && Array.from({ length: 9 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-xl" />)}
          {published?.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl">
              <Picture image={p} usage="list" fill sizes="33vw" />
              <span className="absolute bottom-1 left-1 rounded-full bg-black/45 px-1.5 text-[10px] text-white">{styleLabel(p.style)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
