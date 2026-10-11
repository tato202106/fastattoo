import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PRO_FREE_MONTHS, PRO_PRICE_MONTHLY, PRO_SIGNUP_URL } from "@/lib/pro-offer";

export const metadata: Metadata = {
  title: "Tatoueurs : rejoins Fastattoo",
  description: `Sois visible auprès des personnes qui cherchent un tatoueur près de chez elles. ${PRO_FREE_MONTHS} mois offerts, puis ${PRO_PRICE_MONTHLY} € par mois sans engagement.`,
};

const BENEFITS: { icon: IconName; title: string; text: string }[] = [
  { icon: "map", title: "Sois trouvé·e près de chez toi", text: "Ton profil apparaît sur la carte et dans la recherche par ville et par style." },
  { icon: "image", title: "Un portfolio qui donne envie", text: "Tes plus beaux tatouages en grand, classés par style, lisibles sur téléphone." },
  { icon: "inbox", title: "Des demandes déjà détaillées", text: "Style, zone, taille, budget, photos de référence : tu as tout pour répondre vite." },
  { icon: "calendar", title: "Tes rendez-vous au même endroit", text: "Propose tes créneaux, échange avec tes clients et garde ton agenda à jour." },
];

const STEPS = [
  "Remplis le formulaire d'inscription (2 minutes).",
  "On crée ton profil avec toi : photos, styles, prix, adresse du studio.",
  "Tu reçois tes premières demandes de projets.",
];

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

export default function BecomeArtistPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-safe pb-nav lg:pt-10 lg:pb-16">
      <Link href="/" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted lg:hidden">
        <Icon name="back" size={18} /> Accueil
      </Link>

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

      <section aria-labelledby="tarif" className="mt-10 rounded-[var(--radius-card)] border-2 border-accent bg-surface p-5">
        <h2 id="tarif" className="text-xl font-semibold">
          Un seul abonnement, simple
        </h2>
        <p className="mt-3">
          <span className="text-4xl font-bold">{PRO_PRICE_MONTHLY} €</span>
          <span className="text-muted"> / mois</span>
        </p>
        <p className="mt-2 inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
          {PRO_FREE_MONTHS} mois offerts pour les premiers inscrits
        </p>
        <ul className="mt-4 space-y-2 text-[15px]">
          {["Sans engagement, résiliable à tout moment", "Profil et portfolio mis en avant sur la carte", "Demandes, messages et agenda inclus"].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Icon name="check" size={18} className="mt-0.5 shrink-0 text-success" />
              {t}
            </li>
          ))}
        </ul>
        <SignupButton className="mt-5 w-full" />
      </section>

      <p className="mt-6 text-center text-sm text-muted">Une question ? Pose-la directement dans le formulaire d&apos;inscription, on te répond personnellement.</p>
    </main>
  );
}
