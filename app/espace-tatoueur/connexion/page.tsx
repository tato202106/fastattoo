import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArtistLoginForm } from "@/components/espace/AuthForms";
import { currentAccount } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Connexion tatoueur", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistLoginPage() {
  if (await currentAccount()) redirect("/espace-tatoueur");
  return (
    <main>
      <ArtistLoginForm />
    </main>
  );
}
