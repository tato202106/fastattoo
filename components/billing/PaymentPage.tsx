"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ANNUAL_PERK, annualSavings, formatPrice, PLAN_FEATURES, PLANS, type PlanId } from "@/lib/billing/plans";
import { ManageSubscription } from "./ManageSubscription";
import { PayButton, PaymentTrust } from "./PayButton";

const savings = annualSavings();

/**
 * Page de paiement obligatoire du tatoueur (fin d'inscription, ou tant que
 * l'abonnement n'est pas actif). L'annuel est mis en avant et présélectionné.
 */
export function PaymentPage({
  name,
  fromSignup,
  cancelled,
  fixPayment,
  stripe,
}: {
  name: string;
  fromSignup: boolean;
  cancelled: boolean;
  /** Abonnement existant dont le paiement a échoué : régulariser plutôt que repayer. */
  fixPayment: boolean;
  /** Clé Stripe détectée côté serveur (sinon le paywall s'affiche quand même, le paiement explique ce qui manque). */
  stripe: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanId>("annual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = name.split(" ")[0] || "toi";

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; already?: boolean; redirect?: string; mode?: string };
      if (data.already && data.redirect) {
        router.replace(data.redirect);
        router.refresh();
        return;
      }
      if (data.mode === "demo") throw new Error("Le paiement est momentanément indisponible. Réessaie dans quelques minutes, ou écris-nous si ça persiste.");
      if (!res.ok || !data.url) throw new Error(data.error ?? "Impossible d'ouvrir le paiement. Réessaie.");
      // Laisse l'animation se jouer un instant avant de partir vers Stripe.
      await new Promise((r) => setTimeout(r, 450));
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/compte/deconnexion", { method: "POST" }).catch(() => {});
    router.replace("/");
    router.refresh();
  }

  const header = (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-sm font-semibold whitespace-nowrap text-success">
          <Icon name="check" size={16} /> {fromSignup ? "Compte créé" : "Compte tatoueur"}
        </p>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Link href="/" className="tap inline-flex h-11 items-center gap-1.5 px-1 text-sm text-muted">
            <Icon name="home" size={16} /> Accueil
          </Link>
          <button type="button" onClick={logout} className="tap inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-1 text-sm text-muted">
            <Icon name="logout" size={16} /> <span className="max-sm:sr-only">Déconnexion</span>
          </button>
        </div>
      </div>
      {fromSignup && (
        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted" aria-label="Étape 2 sur 2">
          <span className="h-1.5 flex-1 rounded-full bg-accent" />
          <span className="h-1.5 flex-1 rounded-full bg-accent" />
          <span className="pl-1">Étape 2 / 2</span>
        </div>
      )}
      <h1 className="mt-4 font-display text-[30px] leading-tight font-bold">{fromSignup ? `Dernière étape, ${firstName} !` : "Active ton abonnement"}</h1>
      <p className="mt-1 text-[15px] text-muted">
        L&apos;abonnement est nécessaire pour accéder à ton espace tatoueur et apparaître sur Fastattoo.
      </p>
    </div>
  );

  if (fixPayment && stripe) {
    return (
      <div className="space-y-6 pt-4">
        {header}
        <p role="alert" className="rounded-2xl bg-accent-soft p-4 text-[15px] font-medium text-accent">
          Ton dernier paiement n&apos;est pas passé. Mets à jour ton moyen de paiement pour retrouver l&apos;accès à ton espace.
        </p>
        <ManageSubscription />
      </div>
    );
  }

  const annual = plan === "annual";
  return (
    <div className="space-y-6 pt-4 pb-[calc(170px+var(--safe-bottom))]">
      {header}
      {cancelled && <p className="rounded-xl bg-surface-2 p-3 text-sm">Paiement annulé : aucun montant n&apos;a été prélevé. Choisis ton forfait pour continuer.</p>}

      <div role="radiogroup" aria-label="Forfait" className="space-y-3">
        {/* Forfait annuel : mis en avant */}
        <button
          type="button"
          role="radio"
          aria-checked={annual}
          onClick={() => setPlan("annual")}
          className={clsx(
            "tap relative w-full overflow-hidden rounded-3xl p-5 text-left transition-[transform,opacity]",
            annual ? "animate-plan-glow bg-fg text-bg ring-2 ring-accent" : "bg-fg/90 text-bg opacity-80",
          )}
        >
          <span className="absolute top-0 right-0 rounded-bl-2xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg">★ Le plus avantageux</span>
          <span className="mt-7 mb-1 inline-flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-[15px] font-extrabold text-fg">
            🎁 {ANNUAL_PERK}
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold opacity-80">
            <span className={clsx("inline-flex size-6 items-center justify-center rounded-full border-2", annual ? "border-accent bg-accent" : "border-bg/40")}>
              {annual && <Icon name="check" size={14} strokeWidth={3} className="text-accent-fg" />}
            </span>
            Annuel
          </span>
          <span className="mt-3 flex items-end gap-2">
            <span className="font-display text-[44px] leading-none font-bold">{formatPrice(PLANS.annual.amount)}</span>
            <span className="pb-1 text-[15px] opacity-75">/ an</span>
          </span>
          <span className="mt-1 block text-[15px] opacity-85">soit {formatPrice(savings.perMonth)} par mois</span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-fg">
            <Icon name="sparkle" size={15} /> {formatPrice(savings.saved)} d&apos;économie · −{savings.percent} %
          </span>
          <span className="mt-3 block text-sm opacity-75">
            Au lieu de {formatPrice(savings.yearlyMonthlyCost)} en mensuel : {ANNUAL_PERK} et un seul paiement pour 12 mois.
          </span>
        </button>

        {/* Forfait mensuel : option secondaire */}
        <button
          type="button"
          role="radio"
          aria-checked={!annual}
          onClick={() => setPlan("monthly")}
          className={clsx("tap flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-surface px-4 py-3 text-left", !annual ? "border-fg" : "border-border")}
        >
          <span className={clsx("inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2", !annual ? "border-fg bg-fg" : "border-border")}>
            {!annual && <Icon name="check" size={14} strokeWidth={3} className="text-bg" />}
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">Mensuel</span>
            <span className="block text-xs text-muted">sans engagement</span>
          </span>
          <span className="text-right">
            <span className="block font-bold">{formatPrice(PLANS.monthly.amount)}</span>
            <span className="block text-xs text-muted">/ mois</span>
          </span>
        </button>
        {!annual && (
          <button type="button" onClick={() => setPlan("annual")} className="tap w-full rounded-xl bg-accent-soft px-4 py-3 text-left text-sm font-medium text-accent">
            Avec l&apos;annuel : {ANNUAL_PERK}, soit {formatPrice(savings.saved)} d&apos;économie par an. <span className="underline">Choisir l&apos;annuel</span>
          </button>
        )}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Inclus</h2>
        <ul className="space-y-2 text-[15px]">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex gap-2">
              <Icon name="check" size={20} className="shrink-0 text-success" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-sm text-muted">
        Pas tout de suite ?{" "}
        <Link href="/" className="font-semibold text-fg underline">
          Continuer vers l&apos;accueil
        </Link>
        <span className="block">Ton compte est gardé : tu pourras t&apos;abonner depuis ton espace tatoueur.</span>
      </p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-xl">
          {error && (
            <p role="alert" className="mb-2 text-sm text-accent">
              {error}
            </p>
          )}
          <PayButton busy={busy} onClick={pay} amount={formatPrice(PLANS[plan].amount)} period={PLANS[plan].per} />
          <PaymentTrust />
        </div>
      </div>
    </div>
  );
}
