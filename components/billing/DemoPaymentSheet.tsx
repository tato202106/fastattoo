"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { formatPrice, PLANS, TRIAL_LABEL, type PlanId } from "@/lib/billing/plans";

/**
 * Récapitulatif + confirmation en mode démo (Stripe non configuré).
 * Volontairement sans champ de carte : en production, la saisie se fait sur
 * Stripe Checkout, jamais dans l'application.
 */
export function DemoPaymentSheet({ plan, onConfirm, onClose, upgrade }: { plan: PlanId | null; onConfirm: () => void; onClose: () => void; upgrade?: boolean }) {
  const p = plan ? PLANS[plan] : null;
  return (
    <Sheet
      open={plan != null}
      onClose={onClose}
      title={upgrade ? "Passer au forfait annuel" : "Paiement"}
      footer={
        <Button size="lg" className="w-full" onClick={onConfirm}>
          <Icon name="lock" size={18} /> {!upgrade && TRIAL_LABEL ? `Commencer — ${TRIAL_LABEL}` : `Payer ${p ? formatPrice(p.amount) : ""}`}
        </Button>
      }
    >
      {p && (
        <div className="space-y-4 pb-2">
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
            <div>
              <p className="font-semibold">Fastattoo Pro — {p.name}</p>
              <p className="text-sm text-muted">
                {!upgrade && TRIAL_LABEL ? `${TRIAL_LABEL}, puis renouvelé chaque ${p.per}` : `Renouvelé automatiquement chaque ${p.per}`}, résiliable à tout moment
              </p>
            </div>
            <p className="shrink-0 text-xl font-bold whitespace-nowrap">{formatPrice(p.amount)}</p>
          </div>
          <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <Icon name="sparkle" size={18} className="mt-0.5 shrink-0 text-warning" />
            <span>
              <strong>Mode démonstration</strong> : aucun paiement réel n&apos;est effectué dans l&apos;espace pro de démo. Le vrai paiement se fait à
              l&apos;inscription, sur la page sécurisée Stripe (carte, Apple Pay, Google Pay).
            </span>
          </p>
        </div>
      )}
    </Sheet>
  );
}
