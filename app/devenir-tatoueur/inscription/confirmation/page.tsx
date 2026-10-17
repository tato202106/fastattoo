import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupConfirmation } from "@/components/billing/SignupConfirmation";

export const metadata: Metadata = { title: "Abonnement activé", robots: { index: false } };

export default function SignupConfirmationPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-10">
      <Suspense>
        <SignupConfirmation />
      </Suspense>
    </main>
  );
}
