"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatPrice, PLANS } from "@/lib/billing/plans";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import { UpgradeSlides } from "./UpgradeSlides";

const SNOOZE_MS = 7 * 86_400_000;

/**
 * Pour les tatoueurs au forfait mensuel :
 * - un sheet de slides qui s'ouvre tout seul sur le dashboard (au plus une fois par semaine) ;
 * - une carte de slides permanente dans le dashboard.
 */
export function UpgradePrompt() {
  const hydrated = useHydrated();
  const subscription = useApp((s) => s.subscription);
  const dismissedAt = useApp((s) => s.upsellDismissedAt);
  const dismiss = useApp((s) => s.dismissUpsell);
  const [open, setOpen] = useState(false);
  const monthly = hydrated && subscription?.plan === "monthly";

  useEffect(() => {
    if (!monthly) return;
    const snoozed = dismissedAt != null && Date.now() - dismissedAt < SNOOZE_MS;
    if (snoozed) return;
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [monthly, dismissedAt]);

  if (!monthly) return null;

  const close = () => {
    setOpen(false);
    dismiss();
  };

  return (
    <>
      <section aria-labelledby="upgrade-title" className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 id="upgrade-title" className="text-lg font-semibold">
            Passe à l&apos;annuel
          </h2>
          <span className="text-sm text-muted">{formatPrice(PLANS.annual.amount)} / an</span>
        </div>
        <UpgradeSlides compact />
        <Link href="/pro/abonnement?plan=annual" className={buttonClass("secondary", "lg", "w-full")}>
          Passer à l&apos;annuel — {formatPrice(PLANS.annual.amount)}
        </Link>
      </section>

      <Sheet
        open={open}
        onClose={close}
        title="Économise avec l'annuel"
        footer={
          <div className="space-y-2">
            <Link href="/pro/abonnement?plan=annual" onClick={() => setOpen(false)} className={buttonClass("primary", "lg", "w-full")}>
              Passer à l&apos;annuel — {formatPrice(PLANS.annual.amount)}
            </Link>
            <Button variant="ghost" className="w-full" onClick={close}>
              Plus tard
            </Button>
          </div>
        }
      >
        <UpgradeSlides />
      </Sheet>
    </>
  );
}
