"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** Bouton vers le portail client Stripe (moyen de paiement, factures, résiliation). */
export function ManageSubscription({ returnTo }: { returnTo?: "espace" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/portal${returnTo ? `?retour=${returnTo}` : ""}`, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Impossible d'ouvrir la gestion de l'abonnement");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <Button variant="outline" size="lg" className="w-full" disabled={busy} onClick={open}>
        <Icon name="settings" size={18} /> {busy ? "Ouverture…" : "Gérer mon abonnement"}
      </Button>
      <p className="mt-2 text-center text-sm text-muted">Moyen de paiement, factures ou résiliation, sur la page sécurisée de Stripe.</p>
      {error && <p className="mt-2 text-center text-sm text-accent">{error}</p>}
    </div>
  );
}
