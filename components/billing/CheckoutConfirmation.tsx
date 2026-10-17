"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { isPlanId } from "@/lib/billing/plans";
import { useApp } from "@/lib/store/app";

/** Retour de Stripe Checkout : on vérifie le paiement côté serveur avant d'activer l'abonnement. */
export function CheckoutConfirmation() {
  const params = useSearchParams();
  const router = useRouter();
  const activate = useApp((s) => s.activateSubscription);
  const [state, setState] = useState<"checking" | "ok" | "failed">("checking");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const id = params.get("session_id") ?? "";
    fetch(`/api/billing/verify?session_id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const data = (await r.json()) as { paid?: boolean; plan?: string; renewsAt?: string | null };
        if (!r.ok || !data.paid) throw new Error();
        activate({ plan: isPlanId(data.plan) ? data.plan : "monthly", provider: "stripe", renewsAt: data.renewsAt });
        setState("ok");
        setTimeout(() => router.replace("/pro?bienvenue=1"), 1200);
      })
      .catch(() => setState("failed"));
  }, [params, activate, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {state === "checking" && (
        <>
          <span className="size-10 animate-spin rounded-full border-4 border-border border-t-accent" aria-hidden />
          <p className="mt-4 font-semibold">Vérification du paiement…</p>
        </>
      )}
      {state === "ok" && (
        <>
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
            <Icon name="check" size={32} strokeWidth={3} />
          </span>
          <p className="mt-4 text-xl font-semibold">Paiement confirmé</p>
          <p className="mt-1 text-muted">Ton profil pro est actif.</p>
        </>
      )}
      {state === "failed" && (
        <>
          <p className="text-xl font-semibold">Paiement non confirmé</p>
          <p className="mt-1 text-muted">Aucun abonnement n&apos;a été activé. Tu peux réessayer.</p>
          <Link href="/pro/abonnement" className="tap mt-6 inline-flex h-12 items-center rounded-full bg-fg px-6 font-semibold text-bg">
            Retour à l&apos;abonnement
          </Link>
        </>
      )}
    </div>
  );
}
