"use client";

import clsx from "clsx";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SignupPayment } from "@/components/billing/SignupPayment";
import { PRO_FREE_LABEL, PRO_PRICE_ANNUAL, PRO_PRICE_MONTHLY } from "@/lib/pro-offer";
import type { ArtistSignup } from "@/lib/signup";
import { STYLES } from "@/lib/styles";
import type { StyleSlug } from "@/lib/types";

type Errors = Partial<Record<keyof ArtistSignup, string>>;

const INPUT = "mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg";

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (facultatif)</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-sm text-accent">{error}</span>}
    </label>
  );
}

const PENDING_KEY = "fastattoo-signup-pending";

export function SignupForm() {
  const params = useSearchParams();
  const referrerParam = params.get("parrain") ?? "";
  // Retour de Stripe sans paiement : on revient directement à l'étape de paiement.
  const [pending, setPending] = useState<{ signupId: number | null; email: string } | null>(() => {
    if (typeof window === "undefined" || params.get("paiement") !== "annule") return null;
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null") as { signupId: number | null; email: string } | null;
    } catch {
      return null;
    }
  });
  const [styles, setStyles] = useState<StyleSlug[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(fd.entries()), styles, consent };
    setStatus("sending");
    setErrors({});
    try {
      const res = await fetch("/api/inscriptions-tatoueurs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json().catch(() => ({}))) as { errors?: Errors; error?: string; signupId?: number | null };
      if (res.ok) {
        const next = { signupId: data.signupId ?? null, email: String(fd.get("email") ?? "") };
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
        } catch {
          /* stockage indisponible */
        }
        setPending(next);
        setStatus("done");
        window.scrollTo({ top: 0 });
        return;
      }
      if (data.errors) setErrors(data.errors);
      setMessage(data.error ?? "Certains champs sont à corriger.");
      setStatus("error");
    } catch {
      setMessage("Connexion impossible. Vérifie ta connexion et réessaie.");
      setStatus("error");
    }
  }

  // Inscription enregistrée → paiement (étape 2).
  if (pending || status === "done") {
    return <SignupPayment signupId={pending?.signupId ?? null} email={pending?.email ?? ""} cancelled={params.get("paiement") === "annule"} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Link href="/devenir-tatoueur" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted">
        <Icon name="back" size={18} /> L&apos;offre
      </Link>
      <h1 className="mt-1 font-display text-[28px] leading-tight font-bold">Inscris-toi sur Fastattoo</h1>
      <p className="mt-2 text-[15px] text-muted">
        {PRO_FREE_LABEL}, puis {PRO_PRICE_ANNUAL} € par an (ou {PRO_PRICE_MONTHLY} € par mois). Étape 1 : tes infos, étape 2 : le paiement sécurisé.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Nom ou nom d'artiste" error={errors.name}>
          <input name="name" required autoComplete="name" className={INPUT} />
        </Field>
        <Field label="Nom du studio" optional>
          <input name="studio" autoComplete="organization" className={INPUT} />
        </Field>
        <Field label="Adresse du studio" optional>
          <input name="address" autoComplete="street-address" className={INPUT} />
        </Field>
        <Field label="Ville" error={errors.city}>
          <input name="city" required autoComplete="address-level2" className={INPUT} />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input name="email" type="email" inputMode="email" required autoComplete="email" placeholder="toi@exemple.fr" className={INPUT} />
        </Field>
        <Field label="Téléphone" optional>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" className={INPUT} />
        </Field>
        <Field label="Instagram" optional>
          <input name="instagram" placeholder="@ton.compte" autoCapitalize="none" className={INPUT} />
        </Field>

        <fieldset>
          <legend className="text-sm font-medium">Styles pratiqués</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STYLES.map((s) => {
              const on = styles.includes(s.slug);
              return (
                <button
                  key={s.slug}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStyles((cur) => (on ? cur.filter((x) => x !== s.slug) : [...cur, s.slug]))}
                  className={clsx("tap inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium", on ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          {errors.styles && <span className="mt-1 block text-sm text-accent">{errors.styles}</span>}
        </fieldset>

        <Field label="Prix minimum d'un tatouage (€)" optional>
          <input name="priceFrom" type="number" inputMode="numeric" min={1} className={INPUT} />
        </Field>
        <Field label="Parrainé·e par un tatoueur de Fastattoo ?" optional>
          <input name="referrer" defaultValue={referrerParam} placeholder="Son nom ou son @Instagram" autoCapitalize="none" className={INPUT} />
        </Field>
        <Field label="Une question ou un message ?" optional>
          <textarea name="message" rows={4} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-fg" />
        </Field>

        {/* Champ piège anti-robots, invisible pour les humains. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" />
          <span>J&apos;accepte que Fastattoo utilise ces informations et les photos de mes tatouages pour créer et afficher mon profil.</span>
        </label>
        {errors.consent && <span className="block text-sm text-accent">{errors.consent}</span>}
      </div>

      {status === "error" && <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm text-accent">{message}</p>}

      <button type="submit" disabled={status === "sending"} className={buttonClass("primary", "lg", "mt-6 w-full")}>
        {status === "sending" ? "Envoi…" : "Envoyer mon inscription"}
      </button>
    </form>
  );
}
