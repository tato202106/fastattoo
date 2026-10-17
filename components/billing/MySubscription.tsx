"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import type { PlanId } from "@/lib/billing/plans";
import { SubscribedView } from "./SignupConfirmation";

type Data = { subscription: { plan: PlanId; status: string; renewsAt: string | null; trialEndsAt: string | null } | null; mode?: string };

/** « Mon abonnement » pour un tatoueur abonné (abonnement Stripe relié à ce navigateur). */
export function MySubscription() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => (r.ok ? (r.json() as Promise<Data>) : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="pt-10 text-center text-muted">Impossible de charger ton abonnement. Réessaie dans un instant.</p>;
  if (!data) return <div className="skeleton mt-6 h-40 rounded-2xl" aria-label="Chargement" />;
  if (!data.subscription) {
    return (
      <div className="pt-10 text-center">
        <p className="text-lg font-semibold">Aucun abonnement sur cet appareil</p>
        <p className="mt-1 text-muted">Ouvre cette page sur le téléphone ou l&apos;ordinateur utilisé pour ton inscription, ou inscris-toi.</p>
        <Link href="/devenir-tatoueur" className={buttonClass("primary", "lg", "mt-6")}>
          Devenir tatoueur sur Fastattoo
        </Link>
      </div>
    );
  }
  const s = data.subscription;
  return <SubscribedView initial={{ plan: s.plan, renewsAt: s.renewsAt, trialEndsAt: s.trialEndsAt }} />;
}
