import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/artist/FavoriteButton";
import { MiniMap } from "@/components/artist/MiniMap";
import { PortfolioGallery } from "@/components/artist/PortfolioGallery";
import { ProfileTopBar } from "@/components/artist/ProfileTopBar";
import { ReviewsList } from "@/components/artist/ReviewsList";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { Rating } from "@/components/ui/Rating";
import { artists } from "@/lib/data";
import { formatTime, relativeDay } from "@/lib/dates";
import { toCard } from "@/lib/search/engine";
import { styleLabel } from "@/lib/styles";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await artists.allSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/tatoueurs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await artists.getBySlug(slug);
  if (!a) return {};
  const description = `${a.title} à ${a.city} · ${a.styles.map(styleLabel).join(", ")} · ★ ${a.rating} (${a.reviewCount} avis) · dès ${a.priceFrom} €`;
  return {
    title: `${a.name}, ${a.title.toLowerCase()} à ${a.city}`,
    description,
    openGraph: { title: a.name, description, images: [{ url: `${a.cover.base}/large.webp`, width: 1600 }] },
  };
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="border-t border-border pt-6">
      <h2 id={id} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ArtistPage({ params }: PageProps<"/tatoueurs/[slug]">) {
  const { slug } = await params;
  const a = await artists.getBySlug(slug);
  if (!a) notFound();
  const card = toCard(a, null);
  const requestHref = `/tatoueurs/${a.slug}/demande`;
  const slotsByDay = a.nextSlots.slice(0, 8);

  const identity = (
    <div>
      <div className="flex items-center gap-3">
        <Avatar image={a.avatar} size={56} className="ring-4 ring-bg" />
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-tight font-bold">{a.name}</h1>
          <p className="text-[15px] text-muted">
            {a.title} · {a.city}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[15px]">
        <a href="#avis" className="inline-flex items-center gap-1">
          <Rating value={a.rating} size={16} />
          <span className="text-muted">· {a.reviewCount} avis</span>
        </a>
        {a.verified && (
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <Icon name="verified" size={17} /> Vérifiée
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>dès {a.priceFrom} €</Tag>
        {a.nextSlots[0] && (
          <Tag className="bg-success/12 text-success">
            Dispo {relativeDay(a.nextSlots[0].date).toLowerCase()} à {formatTime(a.nextSlots[0].time)}
          </Tag>
        )}
        <Tag>{a.studio}</Tag>
      </div>
    </div>
  );

  const details = (
    <div className="space-y-6">
      <Section title="Styles" id="styles">
        <div className="flex flex-wrap gap-2">
          {a.styles.map((s) => (
            <Link key={s} href={`/explorer?styles=${s}`} className="tap inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium">
              {styleLabel(s)}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="À propos" id="apropos">
        <p className="text-[15px] leading-relaxed">{a.bio}</p>
        {a.instagram && <p className="mt-2 text-sm text-muted">@{a.instagram}</p>}
      </Section>

      <Section title="Localisation" id="localisation">
        <MiniMap artist={card} />
        <a
          href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=16/${a.lat}/${a.lng}`}
          target="_blank"
          rel="noopener"
          className="tap mt-3 flex min-h-12 items-center gap-2 text-[15px]"
        >
          <Icon name="pin" size={20} className="shrink-0" />
          <span className="flex-1">
            <span className="block font-medium">{a.studio}</span>
            <span className="block text-sm text-muted">{a.address}</span>
          </span>
          <Icon name="chevronRight" size={18} className="text-muted" />
        </a>
      </Section>

      <Section title="Prix" id="prix">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface p-4 shadow-card">
            <p className="text-xs text-muted">À partir de</p>
            <p className="text-2xl font-bold">{a.priceFrom} €</p>
          </div>
          <div className="rounded-2xl bg-surface p-4 shadow-card">
            <p className="text-xs text-muted">Taux horaire</p>
            <p className="text-2xl font-bold">{a.hourlyRate} €/h</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted">Le prix final dépend de la taille, de l&apos;emplacement et du niveau de détail.</p>
      </Section>

      <Section title="Disponibilités" id="dispos">
        {slotsByDay.length ? (
          <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            {slotsByDay.map((s) => (
              <li key={`${s.date}-${s.time}`} className="shrink-0">
                <Link href={`${requestHref}?creneau=${s.date}_${s.time}`} className="tap flex h-16 w-24 flex-col items-center justify-center rounded-2xl border border-border bg-surface text-center">
                  <span className="text-xs text-muted">{relativeDay(s.date)}</span>
                  <span className="font-semibold">{formatTime(s.time)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Pas de créneau libre ce mois-ci. Envoie quand même ta demande !</p>
        )}
      </Section>

      <Section title={`Avis (${a.reviewCount})`} id="avis">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-4xl font-bold">{a.rating.toFixed(1).replace(".", ",")}</span>
          <div>
            <Rating value={a.rating} size={18} />
            <p className="text-sm text-muted">{a.reviewCount} avis vérifiés</p>
          </div>
        </div>
        <ReviewsList artistId={a.id} reviews={a.reviews} />
      </Section>
    </div>
  );

  return (
    <main className="pb-[calc(96px+var(--safe-bottom))] lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-[1fr_380px] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:px-6 lg:pt-8 lg:pb-16">
      {/* Mobile : grande image en haut */}
      <div className="relative h-[58dvh] min-h-[340px] overflow-hidden lg:hidden">
        <Picture image={a.cover} usage="cover" fill priority sizes="100vw" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
        <ProfileTopBar artistId={a.id} name={a.name} />
      </div>

      {/* Identité (desktop : colonne de droite, avec le CTA) */}
      <div className="relative -mt-10 px-4 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:px-0">
        {identity}
        <div className="mt-5 hidden gap-2 lg:flex">
          <Link href={requestHref} className={buttonClass("primary", "lg", "flex-1")}>
            Demander un projet
          </Link>
          <FavoriteButton artistId={a.id} name={a.name} variant="outline" className="size-14 rounded-2xl" />
        </div>
      </div>

      {/* Portfolio : l'élément principal (desktop : grande colonne de gauche) */}
      <section aria-labelledby="portfolio" className="mt-6 px-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:px-0">
        <h2 id="portfolio" className="mb-3 flex items-baseline justify-between text-lg font-semibold">
          Portfolio <span className="text-sm font-normal text-muted">{a.portfolio.length} tatouages</span>
        </h2>
        <PortfolioGallery artistId={a.id} items={a.portfolio} />
      </section>

      <div className="mt-6 px-4 lg:col-start-2 lg:row-start-2 lg:px-0">{details}</div>

      {/* CTA toujours accessible (SPEC §12, §15) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{a.name}</p>
            <p className="truncate text-xs text-muted">dès {a.priceFrom} € · ★ {a.rating.toFixed(1).replace(".", ",")}</p>
          </div>
          <Link href={requestHref} className={buttonClass("primary", "lg", "flex-[1.4]")}>
            Demander un projet
          </Link>
        </div>
      </div>
    </main>
  );
}
