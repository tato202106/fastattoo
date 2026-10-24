import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupPayment } from "@/components/billing/SignupPayment";
import { Icon } from "@/components/ui/Icon";
import { currentAccount } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Activer mon abonnement", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Choix du forfait pour un tatoueur connecté sans abonnement (paiement interrompu, abonnement résilié…). */
export default async function ArtistSubscribePage() {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-10">
      <Link href="/espace-tatoueur" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted">
        <Icon name="back" size={18} /> Mon espace
      </Link>
      <SignupPayment signupId={account.signupId} email={account.email} />
    </main>
  );
}
