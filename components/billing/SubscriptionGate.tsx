"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

/** Pages pro accessibles sans abonnement (profil à compléter, paiement). */
const OPEN = ["/pro/abonnement", "/pro/onboarding"];

/** Un tatoueur sans abonnement actif est envoyé vers la page de paiement. */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const subscribed = useApp((s) => s.subscription != null);
  const open = OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const blocked = hydrated && !subscribed && !open;

  useEffect(() => {
    if (blocked) router.replace("/pro/abonnement");
  }, [blocked, router]);

  if (!open && (!hydrated || blocked)) {
    return (
      <div className="space-y-3 p-4 pt-[calc(var(--safe-top)+16px)]" aria-label="Chargement">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  return <>{children}</>;
}
