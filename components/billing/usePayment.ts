"use client";

import { useEffect, useState } from "react";
import type { PlanId } from "@/lib/billing/plans";
import { useApp } from "@/lib/store/app";

type Mode = "stripe" | "demo" | null;

/**
 * Paiement d'un forfait :
 * - Stripe configuré → redirection vers Stripe Checkout (ou mise à jour de l'abonnement pour l'upgrade) ;
 * - sinon → mode démo : confirmation simulée, aucun encaissement.
 */
export function usePayment() {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoPlan, setDemoPlan] = useState<PlanId | null>(null);
  const session = useApp((s) => s.session);
  const subscription = useApp((s) => s.subscription);
  const activate = useApp((s) => s.activateSubscription);

  useEffect(() => {
    fetch("/api/billing/config")
      .then((r) => r.json() as Promise<{ mode: "stripe" | "demo" }>)
      .then((d) => setMode(d.mode))
      .catch(() => setMode("demo"));
  }, []);

  async function pay(plan: PlanId) {
    setError(null);
    if (mode !== "stripe") {
      setDemoPlan(plan);
      return;
    }
    setBusy(true);
    try {
      const isUpgrade = subscription?.provider === "stripe" && subscription.plan === "monthly" && plan === "annual";
      if (isUpgrade) {
        const res = await fetch("/api/billing/upgrade", { method: "POST" });
        const data = (await res.json()) as { plan?: PlanId; renewsAt?: string | null; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Le changement de forfait a échoué");
        activate({ plan: "annual", provider: "stripe", renewsAt: data.renewsAt });
        setBusy(false);
        return "done" as const;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: session?.email, artistId: session?.userId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Impossible d'ouvrir le paiement");
      window.location.assign(data.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function confirmDemo() {
    if (!demoPlan) return;
    activate({ plan: demoPlan, provider: "demo" });
    setDemoPlan(null);
  }

  return { mode, busy, error, pay, demoPlan, confirmDemo, cancelDemo: () => setDemoPlan(null) };
}
