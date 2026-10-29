import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

/** Adresse inconnue, tatoueur supprimé… : page 404 du site, en français. */
export default function NotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-6 pt-safe pb-nav text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-surface-2">
        <Icon name="search" size={30} />
      </span>
      <h1 className="font-display mt-4 text-2xl font-bold">Page introuvable</h1>
      <p className="mt-1 max-w-xs text-muted">Ce lien ne mène nulle part. Le profil a peut-être été retiré, ou l&apos;adresse contient une faute.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/explorer" className={buttonClass("primary", "lg")}>
          Trouver un tatoueur
        </Link>
        <Link href="/" className={buttonClass("outline", "lg")}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
