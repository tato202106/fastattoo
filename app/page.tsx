import { ArtistPromo } from "@/components/home/ArtistPromo";
import { ClientDashboard, InstallBanner } from "@/components/home/HomeDeferred";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSearch } from "@/components/home/HomeSearch";
import { NearbyArtists } from "@/components/home/NearbyArtists";
import { StyleCarousel } from "@/components/home/StyleCarousel";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { GUIDES } from "@/lib/guides";
import { artists } from "@/lib/data";

// Adresse canonique de l'accueil : la racine (« ./ » du layout donnait /index).
export const metadata: Metadata = { alternates: { canonical: "/" } };

export const revalidate = 3600;

export default async function HomePage() {
  const featured = await artists.featured(4);
  return (
    <main className="mx-auto max-w-5xl px-4 pt-safe pb-nav lg:pt-8 lg:pb-16">
      <HomeHeader />
      <div className="mt-2 space-y-8 lg:mt-0">
        <ClientDashboard />
        <section className="space-y-5 lg:grid lg:grid-cols-2 lg:items-end lg:gap-10 lg:space-y-0">
          <HomeHero />
          <HomeSearch />
        </section>
        <section aria-labelledby="styles-title">
          <h2 id="styles-title" className="mb-3 text-xl font-semibold">
            Explorer les styles
          </h2>
          <StyleCarousel />
        </section>
        <InstallBanner />
        <NearbyArtists initial={featured} />
        <section aria-labelledby="guides-title">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="guides-title" className="text-xl font-semibold">
              Bien préparer ton tatouage
            </h2>
            <Link href="/guides" className="text-sm font-medium underline underline-offset-4">
              Tous les guides
            </Link>
          </div>
          <ul className="grid gap-3 lg:grid-cols-2">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="tap flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
                  <span className="min-w-0 flex-1 text-[15px] font-semibold">{g.title}</span>
                  <Icon name="chevronRight" size={18} className="shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <ArtistPromo />
      </div>
    </main>
  );
}
