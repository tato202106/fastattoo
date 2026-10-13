import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/pro/SignupForm";

export const metadata: Metadata = { title: "Inscription tatoueur", robots: { index: false } };

export default function ArtistSignupPage() {
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-10 lg:pb-16">
      <Suspense>
        <SignupForm />
      </Suspense>
    </main>
  );
}
