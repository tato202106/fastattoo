import type { Metadata } from "next";
import { MySubscription } from "@/components/billing/MySubscription";

export const metadata: Metadata = { title: "Mon abonnement", robots: { index: false } };

export default function MySubscriptionPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-10">
      <h1 className="pt-4 font-display text-[30px] font-bold">Mon abonnement</h1>
      <MySubscription />
    </main>
  );
}
