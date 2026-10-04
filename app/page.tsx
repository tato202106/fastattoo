import { ClientDashboard } from "@/components/client/ClientDashboard";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeSearch } from "@/components/home/HomeSearch";
import { NearbyArtists } from "@/components/home/NearbyArtists";
import { StyleCarousel } from "@/components/home/StyleCarousel";
import { InstallBanner } from "@/components/pwa/InstallPrompt";
import { artists } from "@/lib/data";

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
      </div>
    </main>
  );
}
