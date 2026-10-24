import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArtistSpace } from "@/components/espace/ArtistSpace";
import { autoPublish, listPhotos } from "@/lib/accounts/db";
import { currentAccount } from "@/lib/accounts/session";
import { hasPaidAccess } from "@/lib/billing/access";

export const metadata: Metadata = { title: "Espace tatoueur", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistSpacePage({ searchParams }: PageProps<"/espace-tatoueur">) {
  let account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  const paid = hasPaidAccess(account.subscriptionStatus);
  // Abonné mais pas encore en ligne (paiement fait avant la publication automatique, adresse à géocoder…) : on publie maintenant.
  if (paid && account.status !== "published" && account.status !== "hidden") {
    const result = await autoPublish(account.id).catch((e) => {
      console.error("[compte] publication automatique impossible :", e);
      return null;
    });
    if (result?.account) account = result.account;
  }
  const photos = await listPhotos(account.id).catch(() => []);
  const { bienvenue } = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-6">
      <ArtistSpace initial={account} photos={photos} paid={paid} welcome={bienvenue === "1"} />
    </main>
  );
}
