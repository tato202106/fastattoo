import { Suspense } from "react";
import { BackHeader } from "@/components/billing/BackHeader";
import { SubscriptionPage } from "@/components/billing/SubscriptionPage";

export const metadata = { title: "Abonnement" };

export default function SubscriptionRoute() {
  return (
    <main className="mx-auto max-w-xl">
      <BackHeader title="Abonnement" />
      <Suspense>
        <SubscriptionPage />
      </Suspense>
    </main>
  );
}
