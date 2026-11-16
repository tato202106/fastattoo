import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides du tatouage : prix, soins, douleur, styles",
  description: "Nos guides pour préparer ton tatouage : combien ça coûte, comment le soigner, les zones qui font le moins mal et les styles pour choisir.",
  alternates: { canonical: "/guides" },
};

/** Liste des guides pour les futurs tatoués. */
export default function GuidesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-safe pb-nav lg:pt-10 lg:pb-16">
      <header className="pt-6">
        <p className="text-sm font-semibold text-accent">Guides</p>
        <h1 className="mt-1 font-display text-[34px] leading-tight font-bold">Bien préparer ton tatouage</h1>
        <p className="mt-2 text-[15px] text-muted">Prix, soins, douleur, styles : l&apos;essentiel avant de te lancer.</p>
      </header>
      <ul className="mt-8 space-y-4">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="tap flex items-center gap-4 rounded-2xl bg-surface p-5 shadow-card">
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">{g.title}</span>
                <span className="mt-1 block text-sm text-muted">{g.excerpt}</span>
              </span>
              <Icon name="chevronRight" size={20} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
