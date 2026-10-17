import { Suspense } from "react";
import { CheckoutConfirmation } from "@/components/billing/CheckoutConfirmation";

export const metadata = { title: "Confirmation du paiement" };

export default function ConfirmationRoute() {
  return (
    <main className="mx-auto max-w-xl">
      <Suspense>
        <CheckoutConfirmation />
      </Suspense>
    </main>
  );
}
