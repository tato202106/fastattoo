"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass, Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { annualSavings, formatPrice, PLAN_FEATURES, PLANS, TRIAL_LABEL, type PlanId } from "@/lib/billing/plans";
import { PlanOption } from "./SubscriptionPage";

const savings = annualSavings();

/**
 * Dernière étape de l'inscription : choix du forfait et paiement sur Stripe
 * Checkout. Sans Stripe configuré, l'inscription reste enregistrée et on
 * l'indique honnêtement (aucun faux paiement).
 */
export function SignupPayment({ signupId, email, cancelled }: { signupId: number | null; email: string; cancelled?: boolean }) {
  const [mode, setMode] = useState<"stripe" | "demo" | null>(null);
  const [plan, setPlan] = useState<PlanId>("annual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/config")
      .then((r) => r.json() as Promise<{ mode: "stripe" | "demo" }>)
      .then((d) => setMode(d.mode))
      .catch(() => setMode("demo"));
  }, []);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email, signupId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Impossible d'ouvrir le paiement");
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (mode === null) return <div className="skeleton mt-10 h-64 rounded-3xl" aria-label="Chargement" />;

  if (mode === "demo") {
    return (
      <div className="pt-10 text-center">
        <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
          <Icon name="check" size={32} />
        </span>
        <h1 className="mt-4 font-display text-[28px] leading-tight font-bold">Merci, c&apos;est noté !</h1>
        <p className="mt-2 text-muted">Ton inscription est enregistrée. Le paiement en ligne arrive très bientôt : on te recontacte par e-mail pour activer ton profil.</p>
        <Link href="/" className={buttonClass("outline", "lg", "mt-6 w-full max-w-xs")}>
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-[calc(140px+var(--safe-bottom))]">
      <div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-sm font-semibold text-success">
          <Icon name="check" size={16} /> Inscription enregistrée
        </p>
        <h1 className="mt-3 font-display text-[28px] leading-tight font-bold">Dernière étape : active ton profil</h1>
        <p className="mt-1 text-muted">Choisis ton forfait. {TRIAL_LABEL ? `${TRIAL_LABEL} pour les premiers inscrits, résiliable à tout moment.` : "Résiliable à tout moment."}</p>
      </div>
      {cancelled && <p className="rounded-xl bg-surface-2 p-3 text-sm">Paiement annulé : aucun montant n&apos;a été prélevé. Tu peux réessayer.</p>}

      <div className="space-y-4 pt-2" role="radiogroup" aria-label="Forfait">
        <PlanOption plan="annual" selected={plan === "annual"} onSelect={() => setPlan("annual")} />
        <PlanOption plan="monthly" selected={plan === "monthly"} onSelect={() => setPlan("monthly")} />
      </div>
      <p className="text-sm text-muted">
        Avec l&apos;annuel, tu économises {formatPrice(savings.saved)} par an (soit {formatPrice(savings.perMonth)} par mois).
      </p>

      <ul className="space-y-2 text-[15px]">
        {PLAN_FEATURES.map((f) => (
          <li key={f} className="flex gap-2">
            <Icon name="check" size={20} className="shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-xl">
          {error && <p className="mb-2 text-sm text-accent">{error}</p>}
          <Button size="lg" className="w-full" disabled={busy} onClick={pay}>
            <Icon name="lock" size={18} /> {busy ? "Ouverture du paiement…" : TRIAL_LABEL ? `Commencer — ${TRIAL_LABEL}` : `Payer ${formatPrice(PLANS[plan].amount)}`}
          </Button>
          <p className="mt-2 text-center text-xs text-muted">
            {TRIAL_LABEL ? `Puis ${formatPrice(PLANS[plan].amount)} / ${PLANS[plan].per}. ` : ""}Paiement sécurisé par Stripe (carte, Apple Pay, Google Pay).
          </p>
        </div>
      </div>
    </div>
  );
}
