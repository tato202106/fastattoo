import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArtistSpace } from "@/components/espace/ArtistSpace";
import { currentAccount } from "@/lib/accounts/session";

export const metadata: Metadata = { title: "Espace tatoueur", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistSpacePage({ searchParams }: PageProps<"/espace-tatoueur">) {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  const { bienvenue } = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-6">
      <ArtistSpace initial={account} welcome={bienvenue === "1"} />
    </main>
  );
}
