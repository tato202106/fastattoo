"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPrice, PLANS } from "@/lib/billing/plans";
import { UpgradeSlides } from "./UpgradeSlides";

/**
 * Slides + passage à l'annuel pour un vrai abonné Stripe (abonnement relié à ce
 * navigateur par cookie httpOnly). Stripe facture la différence au prorata.
 */
export function RealUpgrade({ onUpgraded }: { onUpgraded: (renewsAt: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/upgrade", { method: "POST" });
      const data = (await res.json()) as { renewsAt?: string | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Le changement de forfait a échoué");
      onUpgraded(data.renewsAt ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="annuel" className="space-y-4">
      <h2 id="annuel" className="font-display text-[26px] leading-tight font-bold">
        Passe à l&apos;annuel
      </h2>
      <UpgradeSlides />
      {error && <p className="text-sm text-accent">{error}</p>}
      {confirm ? (
        <div className="space-y-2 rounded-2xl border border-border p-4">
          <p className="text-[15px]">
            Ton abonnement passe à <strong>{formatPrice(PLANS.annual.amount)} / an</strong>. La différence est calculée au prorata et prélevée
            maintenant sur ton moyen de paiement enregistré.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button className="flex-1" disabled={busy} onClick={upgrade}>
              {busy ? "…" : "Confirmer"}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="lg" className="w-full" onClick={() => setConfirm(true)}>
          <Icon name="sparkle" size={18} /> Passer à l&apos;annuel — {formatPrice(PLANS.annual.amount)}
        </Button>
      )}
    </section>
  );
}
