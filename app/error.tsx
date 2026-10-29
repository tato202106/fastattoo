"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Plantage d'une page : message en français plutôt que l'écran d'erreur par défaut. */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[page] erreur :", error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 pt-safe pb-nav text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-surface-2">
        <Icon name="refresh" size={30} />
      </span>
      <h1 className="font-display mt-4 text-2xl font-bold">Oups, un souci de notre côté</h1>
      <p className="mt-1 max-w-xs text-muted">La page n&apos;a pas pu s&apos;afficher. Réessaie dans un instant.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => window.location.reload()} className={buttonClass("primary", "lg")}>
          Réessayer
        </button>
        <Link href="/" className={buttonClass("outline", "lg")}>
          Retour à l&apos;accueil
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted">Code : {error.digest}</p>}
    </main>
  );
}
