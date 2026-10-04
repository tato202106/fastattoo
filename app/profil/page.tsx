import type { Metadata } from "next";
import { LoginGate, PageHeader } from "@/components/account/LoginGate";
import { ProfileView } from "@/components/account/ProfileView";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-2xl pb-nav">
      <PageHeader title="Profil" />
      <LoginGate title="Ton espace" text="Favoris, demandes, rendez-vous et messages au même endroit.">
        <ProfileView />
      </LoginGate>
    </main>
  );
}
