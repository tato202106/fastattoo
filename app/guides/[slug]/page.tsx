import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { siteUrl } from "@/lib/site-url";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description },
  };
}

const formatDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00Z`));

/** Un guide pour les futurs tatoués. */
export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const others = GUIDES.filter((o) => o.slug !== g.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.description,
    dateModified: g.updated,
    inLanguage: "fr-FR",
    mainEntityOfPage: `${siteUrl()}/guides/${g.slug}`,
    publisher: { "@type": "Organization", name: "Fastattoo", url: siteUrl() },
  };
  return (
    <main className="mx-auto max-w-2xl px-4 pt-safe pb-nav lg:pt-10 lg:pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/guides" className="tap mt-4 inline-flex h-11 items-center gap-1 text-sm font-medium text-muted">
        <Icon name="back" size={16} /> Tous les guides
      </Link>
      <article>
        <h1 className="mt-2 font-display text-[32px] leading-tight font-bold">{g.title}</h1>
        <p className="mt-2 text-sm text-muted">Mis à jour le {formatDate(g.updated)}</p>
        <p className="mt-5 text-[17px] leading-relaxed">{g.intro}</p>
        {g.sections.map((s) => (
          <section key={s.title} className="mt-8">
            <h2 className="font-display text-[24px] font-bold">{s.title}</h2>
            {s.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed marker:text-accent">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
            {s.paragraphs?.map((p) => (
              <p key={p} className="mt-3 text-[16px] leading-relaxed">
                {p}
              </p>
            ))}
          </section>
        ))}
        <aside className="mt-10 rounded-2xl bg-surface p-5 shadow-card">
          <p className="text-[16px] font-semibold">{g.cta.text}</p>
          <Link href={g.cta.href} className={buttonClass("primary", "lg", "mt-3 w-full")}>
            {g.cta.label}
          </Link>
        </aside>
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-muted">Sources</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {g.sources.map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noopener" className="underline underline-offset-2">
                  {src.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
      <nav aria-label="Autres guides" className="mt-10">
        <h2 className="font-display text-[22px] font-bold">À lire aussi</h2>
        <ul className="mt-3 space-y-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}`} className="tap flex h-12 items-center justify-between rounded-xl bg-surface px-4 text-[15px] font-medium shadow-card">
                {o.title}
                <Icon name="chevronRight" size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
