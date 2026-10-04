import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/account/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-[calc(var(--safe-top)+12px)] pb-8">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
