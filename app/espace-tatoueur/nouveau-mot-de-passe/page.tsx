import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/espace/AuthForms";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <main>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
