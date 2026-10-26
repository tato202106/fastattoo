import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArtistThread } from "@/components/requests/ArtistThread";
import { currentAccount } from "@/lib/accounts/session";
import { markRead, threadForArtist } from "@/lib/requests/db";

export const metadata: Metadata = { title: "Demande de projet", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ArtistRequestPage({ params }: PageProps<"/espace-tatoueur/demandes/[id]">) {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const thread = await threadForArtist(account.id, id).catch((e) => {
    console.error("[demandes] lecture impossible :", e);
    return null;
  });
  if (!thread) notFound();
  await markRead(id, "artist").catch(() => {});
  const { clientEmail: _e, clientToken: _t, ...publicThread } = thread;
  void _e;
  void _t;
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-6">
      <Link href="/espace-tatoueur/demandes" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted">
        ← Mes demandes
      </Link>
      <ArtistThread initial={publicThread} />
    </main>
  );
}
