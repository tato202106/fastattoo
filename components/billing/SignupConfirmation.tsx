"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPrice, PLANS, type PlanId } from "@/lib/billing/plans";
import { formatLongDate } from "@/lib/dates";
import { ManageSubscription } from "./ManageSubscription";
import { RealUpgrade } from "./RealUpgrade";

interface Verified {
  plan: PlanId;
  renewsAt: string | null;
  trialEndsAt: string | null;
  /** Statut Stripe (active, trialing, past_due, canceled…), si connu. */
  status?: string;
  /** Résiliation demandée : l'abonnement s'arrête à la fin de la période. */
  cancelAtPeriodEnd?: boolean;
}

const UNPAID = new Set(["past_due", "unpaid", "incomplete"]);
const ENDED = new Set(["canceled", "incomplete_expired"]);

/** Retour de Stripe après l'inscription : vérification serveur, puis proposition de l'annuel aux abonnés mensuels. */
export function SignupConfirmation() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "failed" | Verified>("checking");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch(`/api/billing/verify?session_id=${encodeURIComponent(params.get("session_id") ?? "")}`)
      .then(async (r) => {
        const data = (await r.json()) as { paid?: boolean; account?: boolean } & Verified;
        if (!r.ok || !data.paid) throw new Error();
        // Compte tatoueur connecté : direction son espace pour compléter son profil.
        if (data.account) {
          router.replace("/espace-tatoueur?bienvenue=1");
          return;
        }
        setState({ plan: data.plan, renewsAt: data.renewsAt, trialEndsAt: data.trialEndsAt });
      })
      .catch(() => setState("failed"));
  }, [params, router]);

  if (state === "checking") {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <span className="size-10 animate-spin rounded-full border-4 border-border border-t-accent" aria-hidden />
        <p className="mt-4 font-semibold">Vérification du paiement…</p>
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
        <p className="text-xl font-semibold">Paiement non confirmé</p>
        <p className="mt-1 text-muted">Aucun abonnement n&apos;a été activé. Ton inscription reste enregistrée.</p>
        <Link href="/devenir-tatoueur/inscription?paiement=annule" className={buttonClass("primary", "lg", "mt-6")}>
          Réessayer le paiement
        </Link>
      </div>
    );
  }
  return <SubscribedView initial={state} welcome />;
}

/** Récapitulatif d'un abonnement réel + slides vers l'annuel s'il est mensuel. */
export function SubscribedView({ initial, welcome, returnTo }: { initial: Verified; welcome?: boolean; returnTo?: "espace" }) {
  const [sub, setSub] = useState(initial);
  const p = PLANS[sub.plan];
  return (
    <div className="space-y-6 pb-10">
      {welcome && (
        <div className="pt-6 text-center">
          <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
            <Icon name="check" size={32} strokeWidth={3} />
          </span>
          <h1 className="mt-4 font-display text-[28px] leading-tight font-bold">Bienvenue sur Fastattoo !</h1>
          <p className="mt-2 text-muted">Ton abonnement est actif. On te contacte par e-mail pour mettre ton profil en ligne avec toi.</p>
        </div>
      )}
      <section className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Ton forfait</p>
        <p className="mt-1 text-2xl font-bold">
          {p.name} · {formatPrice(p.amount)} / {p.per}
        </p>
        {sub.status && ENDED.has(sub.status) ? (
          <p className="mt-1 text-sm font-medium text-accent">Abonnement résilié</p>
        ) : sub.cancelAtPeriodEnd && sub.renewsAt ? (
          <p className="mt-1 text-sm font-medium text-accent">Résiliation programmée : ton abonnement s&apos;arrête le {formatLongDate(sub.renewsAt)}</p>
        ) : sub.trialEndsAt ? (
          <p className="mt-1 text-sm text-muted">Premier prélèvement le {formatLongDate(sub.trialEndsAt)}</p>
        ) : sub.renewsAt ? (
          <p className="mt-1 text-sm text-muted">Prochain renouvellement le {formatLongDate(sub.renewsAt)}</p>
        ) : null}
      </section>
      {sub.status && UNPAID.has(sub.status) && (
        <p role="alert" className="rounded-2xl bg-accent-soft p-4 text-[15px] font-medium text-accent">
          Ton dernier paiement n&apos;est pas passé. Mets à jour ton moyen de paiement pour que ton abonnement continue.
        </p>
      )}
      {!welcome && <ManageSubscription returnTo={returnTo} />}
      {sub.status && ENDED.has(sub.status) ? null : sub.plan === "monthly" ? (
        <RealUpgrade onUpgraded={(renewsAt) => setSub({ ...sub, plan: "annual", renewsAt })} />
      ) : (
        <p className="rounded-2xl bg-success/10 p-4 text-[15px] font-medium text-success">Tu profites du meilleur tarif : {formatPrice(PLANS.annual.amount)} pour 12 mois 🎉</p>
      )}
    </div>
  );
}
