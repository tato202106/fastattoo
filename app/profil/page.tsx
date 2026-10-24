import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginGate, PageHeader } from "@/components/account/LoginGate";
import { ProfileView } from "@/components/account/ProfileView";
import { currentAccount } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  // Un tatoueur connecté retrouve son profil et ses photos dans son espace.
  if (await currentAccount()) redirect("/espace-tatoueur");
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <PageHeader title="Profil" />
      <LoginGate title="Ton espace" text="Favoris, demandes, rendez-vous et messages au même endroit.">
        <ProfileView />
      </LoginGate>
    </main>
  );
}
