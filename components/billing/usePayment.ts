"use client";

import { useEffect, useState } from "react";
import type { PlanId } from "@/lib/billing/plans";
import { useApp } from "@/lib/store/app";

interface BillingConfig {
  mode: "stripe" | "demo";
  /** Ce navigateur est relié à un vrai abonnement Stripe (payé à l'inscription). */
  hasSubscription: boolean;
}

/**
 * Paiement dans l'espace pro.
 * - Nouvelle souscription : confirmation de démonstration (l'espace pro n'a pas
 *   encore de vrais comptes ; le vrai paiement se fait à l'inscription, /devenir-tatoueur).
 * - Passage à l'annuel : réel (Stripe, prorata) si ce navigateur est relié à un
 *   abonnement payé, sinon démonstration.
 */
export function usePayment() {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoPlan, setDemoPlan] = useState<PlanId | null>(null);
  const subscription = useApp((s) => s.subscription);
  const activate = useApp((s) => s.activateSubscription);

  useEffect(() => {
    fetch("/api/billing/config")
      .then((r) => r.json() as Promise<BillingConfig>)
      .then(setConfig)
      .catch(() => setConfig({ mode: "demo", hasSubscription: false }));
  }, []);

  const realUpgrade = config?.mode === "stripe" && config.hasSubscription;

  async function pay(plan: PlanId): Promise<"done" | void> {
    setError(null);
    const isUpgrade = subscription?.plan === "monthly" && plan === "annual";
    if (!isUpgrade || !realUpgrade) {
      setDemoPlan(plan);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/billing/upgrade", { method: "POST" });
      const data = (await res.json()) as { renewsAt?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Le changement de forfait a échoué");
      activate({ plan: "annual", provider: "stripe", renewsAt: data.renewsAt });
      return "done";
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function confirmDemo() {
    if (!demoPlan) return;
    activate({ plan: demoPlan, provider: "demo" });
    setDemoPlan(null);
  }

  return { ready: config != null, busy, error, pay, demoPlan, confirmDemo, cancelDemo: () => setDemoPlan(null) };
}
