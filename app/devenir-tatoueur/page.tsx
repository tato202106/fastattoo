import type { Metadata } from "next";
import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { annualSavings, formatPrice } from "@/lib/billing/plans";
import { PRO_ANNUAL_PERK, PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY, PRO_SIGNUP_URL, proSignupUrlFor } from "@/lib/pro-offer";
import { SPONSOR_BOOST_MONTHS } from "@/lib/referral";

export const metadata: Metadata = {
  title: "Tatoueurs : rejoins Fastattoo",
  description: `Sois visible auprès des personnes qui cherchent un tatoueur près de chez elles. ${PRO_PRICE_ANNUAL} € par an (${PRO_ANNUAL_PERK}) ou ${PRO_PRICE_MONTHLY} € par mois.`,
};

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: "map", title: "Sois trouvé·e près de chez toi", text: "Ton profil apparaît sur la carte et dans la recherche par ville et par style." },
  { icon: "image", title: "Un portfolio qui donne envie", text: "Tes plus beaux tatouages en grand, classés par style, lisibles sur téléphone." },
  { icon: "inbox", title: "Des demandes déjà détaillées", text: "Style, zone, taille, budget, photos de référence : tu as tout pour répondre vite." },
  { icon: "calendar", title: "Tes rendez-vous au même endroit", text: "Propose tes créneaux, échange avec tes clients et garde ton agenda à jour." },
];

const STEPS = [
  "Remplis le formulaire d'inscription (2 minutes).",
  "Choisis ton forfait et active-le avec le paiement sécurisé.",
  "On crée ton profil avec toi : photos, styles, prix, adresse du studio.",
  "Tu reçois tes premières demandes de projets.",
];

const savings = annualSavings();

function SignupButton({ className }: { className?: string }) {
  if (!PRO_SIGNUP_URL) {
    return (
      <span aria-disabled className={buttonClass("outline", "lg", className)}>
        Inscriptions bientôt ouvertes
      </span>
    );
  }
  if (PRO_SIGNUP_URL.startsWith("/")) {
    return (
      <Link href={PRO_SIGNUP_URL} className={buttonClass("primary", "lg", className)}>
        Je m&apos;inscris
      </Link>
    );
  }
  return (
    <a href={PRO_SIGNUP_URL} target="_blank" rel="noopener" className={buttonClass("primary", "lg", className)}>
      Je m&apos;inscris
    </a>
  );
}

/** Carte de forfait : cliquable, elle mène à l'inscription avec ce forfait présélectionné au paiement. */
function PlanCard({ plan, label, className, children }: { plan: "annual" | "monthly"; label: string; className: string; children: ReactNode }) {
  const base = clsx("block rounded-[var(--radius-card)] bg-surface p-5 text-left", className);
  if (!PRO_SIGNUP_URL) return <div className={base}>{children}</div>;
  const href = proSignupUrlFor(plan);
  const cta = (
    <span className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-full bg-fg/5 text-[15px] font-semibold text-accent">
      {label} <Icon name="chevronRight" size={16} />
    </span>
  );
  const interactive = clsx(base, "tap transition-shadow hover:shadow-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none");
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={interactive}>
        {children}
        {cta}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener" className={interactive}>
      {children}
      {cta}
    </a>
  );
}

export default function BecomeArtistPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-safe pb-nav lg:pt-10 lg:pb-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted lg:invisible">
          <Icon name="back" size={18} /> Accueil
        </Link>
        <Link href="/espace-tatoueur" className="tap inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium">
          <Icon name="user" size={16} /> Espace tatoueur
        </Link>
      </div>

      <section className="mt-2 lg:mt-0">
        <p className="text-sm font-semibold text-accent">Pour les tatoueurs et tatoueuses</p>
        <h1 className="mt-2 font-display text-[34px] leading-[1.05] font-bold tracking-tight sm:text-[40px] lg:text-5xl">
          Plus de projets qui te ressemblent.
        </h1>
        <p className="mt-3 text-[17px] text-muted">
          Fastattoo aide les personnes qui veulent se faire tatouer à trouver l&apos;artiste qui correspond à leur style, près de chez elles.
        </p>
        <SignupButton className="mt-6 w-full sm:w-auto sm:px-8" />
      </section>

      <section aria-labelledby="avantages" className="mt-10">
        <h2 id="avantages" className="mb-4 text-xl font-semibold">
          Ce que tu y gagnes
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b.title} className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card">
              <Icon name={b.icon} size={24} className="text-accent" />
              <p className="mt-2 font-semibold">{b.title}</p>
              <p className="mt-1 text-sm text-muted">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="etapes" className="mt-10">
        <h2 id="etapes" className="mb-4 text-xl font-semibold">
          Comment ça marche
        </h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg">{i + 1}</span>
              <span className="pt-1 text-[15px]">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="parrainage" className="mt-10 rounded-[var(--radius-card)] bg-surface-2 p-5">
        <h2 id="parrainage" className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="crown" size={22} strokeWidth={1.5} className="text-[#9a6b00]" /> Parrainage
        </h2>
        <p className="mt-2 text-[15px]">
          Déjà sur Fastattoo ? Fais venir un ou une collègue : quand ton filleul s&apos;abonne, tu gagnes le badge{" "}
          <strong>« Parrain »</strong> et ton profil est <strong>mis en avant dans la recherche pendant {SPONSOR_BOOST_MONTHS} mois</strong>.
        </p>
        <ol className="mt-3 space-y-1.5 text-[15px]">
          <li>1. Ton filleul s&apos;inscrit avec le formulaire.</li>
          <li>2. Il indique ton nom ou ton @Instagram dans « Parrainé·e par ».</li>
          <li>3. Dès son abonnement, ta mise en avant démarre.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">Pas de limite : chaque nouveau filleul abonné prolonge ta mise en avant.</p>
      </section>

      <section aria-labelledby="tarif" className="mt-10">
        <h2 id="tarif" className="text-xl font-semibold">
          Deux forfaits, sans surprise
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PlanCard plan="annual" label="Choisir l'annuel" className="relative border-2 border-accent">
            <span className="absolute -top-3 left-5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-fg">
              Recommandé · 🎁 {PRO_ANNUAL_PERK}
            </span>
            <p className="font-semibold">Annuel</p>
            <p className="mt-1">
              <span className="text-4xl font-bold">{PRO_PRICE_ANNUAL} €</span>
              <span className="text-muted"> / an</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              Soit {formatPrice(savings.perMonth)} par mois, en un seul paiement
            </p>
            <p className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-accent">{PRO_ANNUAL_PERK} par rapport au mensuel</p>
          </PlanCard>
          <PlanCard plan="monthly" label="Choisir le mensuel" className="border border-border">
            <p className="font-semibold">Mensuel</p>
            <p className="mt-1">
              <span className="text-4xl font-bold">{PRO_PRICE_MONTHLY} €</span>
              <span className="text-muted"> / mois</span>
            </p>
            <p className="mt-1 text-sm text-muted">Sans engagement</p>
          </PlanCard>
        </div>
        <ul className="mt-4 space-y-2 text-[15px]">
          {["Résiliable à tout moment", "Profil et portfolio mis en avant sur la carte", "Demandes, messages et agenda inclus", "Paiement sécurisé par Stripe"].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Icon name="check" size={18} className="mt-0.5 shrink-0 text-success" />
              {t}
            </li>
          ))}
        </ul>
        <SignupButton className="mt-5 w-full" />
        <p className="mt-3 text-center text-sm">
          Déjà abonné·e ?{" "}
          <Link href="/mon-abonnement" className="font-semibold text-accent underline underline-offset-4">
            Mon abonnement
          </Link>
        </p>
      </section>

      <p className="mt-6 text-center text-sm text-muted">Une question ? Pose-la directement dans le formulaire d&apos;inscription, on te répond personnellement.</p>
    </main>
  );
}
