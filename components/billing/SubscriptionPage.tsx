"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ANNUAL_PERK, annualSavings, formatPrice, PLAN_FEATURES, PLANS, type PlanId } from "@/lib/billing/plans";
import { formatLongDate } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { DemoPaymentSheet } from "./DemoPaymentSheet";
import { UpgradeSlides } from "./UpgradeSlides";
import { usePayment } from "./usePayment";

const savings = annualSavings();

export function PlanOption({ plan, selected, onSelect }: { plan: PlanId; selected: boolean; onSelect: () => void }) {
  const p = PLANS[plan];
  const annual = plan === "annual";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx("tap relative w-full rounded-2xl border-2 bg-surface p-4 text-left", selected ? "border-fg" : "border-border")}
    >
      {annual && <span className="absolute -top-3 right-4 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-fg">🎁 {ANNUAL_PERK}</span>}
      <span className="flex items-center gap-3">
        <span className={clsx("inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-fg bg-fg" : "border-border")}>
          {selected && <Icon name="check" size={14} strokeWidth={3} className="text-bg" />}
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{p.name}</span>
          <span className="block text-sm text-muted">{annual ? `soit ${formatPrice(savings.perMonth)} / mois` : "sans engagement"}</span>
        </span>
        <span className="text-right">
          <span className="block text-xl font-bold">{formatPrice(p.amount)}</span>
          <span className="block text-xs text-muted">/ {p.per}</span>
        </span>
      </span>
    </button>
  );
}

/**
 * Abonnement tatoueur (Phase 6) :
 * - sans abonnement : paiement à l'inscription (le profil pro s'active après) ;
 * - forfait mensuel : slides et bouton pour passer à l'annuel (179 €) ;
 * - forfait annuel : récapitulatif.
 */
export function SubscriptionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const subscription = useApp((s) => s.subscription);
  const [plan, setPlan] = useState<PlanId>(params.get("plan") === "monthly" ? "monthly" : "annual");
  const { ready, busy, error, pay, demoPlan, confirmDemo, cancelDemo } = usePayment();
  const [justPaid, setJustPaid] = useState(false);
  const cancelled = params.get("annule") === "1";

  // Après un premier paiement, direction le dashboard.
  useEffect(() => {
    if (justPaid && subscription && !params.get("plan")) router.replace("/pro?bienvenue=1");
  }, [justPaid, subscription, router, params]);

  const onConfirmDemo = () => {
    confirmDemo();
    setJustPaid(true);
  };

  const payButton = (target: PlanId, label: string) => (
    <Button size="lg" className="w-full" disabled={busy || !ready} onClick={async () => (await pay(target)) === "done" && setJustPaid(true)}>
      {busy ? "Redirection vers le paiement…" : label}
    </Button>
  );

  /* ---------- Déjà abonné ---------- */
  if (subscription) {
    const current = PLANS[subscription.plan];
    return (
      <div className="space-y-6 px-4 pb-[calc(110px+var(--safe-bottom))] lg:px-0">
        <section className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Ton forfait</p>
          <p className="mt-1 text-2xl font-bold">
            {current.name} · {formatPrice(current.amount)} / {current.per}
          </p>
          <p className="mt-1 text-sm text-muted">
            {`Renouvellement le ${formatLongDate(subscription.renewsAt)}`}
          </p>
          {subscription.provider === "demo" && <p className="mt-2 text-xs text-warning">Abonnement de démonstration (aucun paiement réel).</p>}
        </section>

        {subscription.plan === "monthly" ? (
          <>
            <h2 className="font-display text-[26px] leading-tight font-bold">Passe à l&apos;annuel</h2>
            <UpgradeSlides />
            <ul className="space-y-2 text-[15px]">
              <li className="flex gap-2">
                <Icon name="check" size={20} className="shrink-0 text-success" /> Changement immédiat, sans perdre ton profil ni tes demandes
              </li>
              <li className="flex gap-2">
                <Icon name="check" size={20} className="shrink-0 text-success" /> Le mois en cours est déduit au prorata
              </li>
            </ul>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0">
              <div className="mx-auto max-w-xl">
                {error && <p className="mb-2 text-sm text-accent">{error}</p>}
                {payButton("annual", `Passer à l'annuel — ${formatPrice(PLANS.annual.amount)}`)}
              </div>
            </div>
          </>
        ) : (
          <section className="rounded-2xl bg-success/10 p-4">
            <p className="font-semibold text-success">Tu profites déjà du meilleur tarif 🎉</p>
            <p className="mt-1 text-sm">
              {ANNUAL_PERK} par rapport au forfait mensuel, soit {formatPrice(savings.perMonth)} par mois.
            </p>
          </section>
        )}
        <DemoPaymentSheet plan={demoPlan} upgrade onClose={cancelDemo} onConfirm={confirmDemo} />
      </div>
    );
  }

  /* ---------- Inscription : paiement ---------- */
  return (
    <div className="space-y-6 px-4 pb-[calc(130px+var(--safe-bottom))] lg:px-0">
      <div>
        <h1 className="font-display text-[30px] leading-tight font-bold">Active ton profil pro</h1>
        <p className="mt-1 text-muted">Ton profil apparaît sur la carte dès le paiement validé.</p>
      </div>
      {cancelled && <p className="rounded-xl bg-surface-2 p-3 text-sm">Paiement annulé : aucun montant n&apos;a été prélevé.</p>}

      <div className="space-y-4 pt-2" role="radiogroup" aria-label="Forfait">
        <PlanOption plan="annual" selected={plan === "annual"} onSelect={() => setPlan("annual")} />
        <PlanOption plan="monthly" selected={plan === "monthly"} onSelect={() => setPlan("monthly")} />
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Inclus dans les deux forfaits</h2>
        <ul className="space-y-2 text-[15px]">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex gap-2">
              <Icon name="check" size={20} className="shrink-0 text-success" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted">
        <Icon name="lock" size={14} /> Paiement sécurisé par Stripe · résiliable à tout moment
      </p>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto max-w-xl">
          {error && <p className="mb-2 text-sm text-accent">{error}</p>}
          {payButton(plan, `Payer ${formatPrice(PLANS[plan].amount)}${plan === "annual" ? " pour 1 an" : " / mois"}`)}
          <p className="mt-2 text-center text-xs text-muted">Espace pro de démonstration : aucun paiement réel ici.</p>
        </div>
      </div>
      <DemoPaymentSheet plan={demoPlan} onClose={cancelDemo} onConfirm={onConfirmDemo} />
    </div>
  );
}
