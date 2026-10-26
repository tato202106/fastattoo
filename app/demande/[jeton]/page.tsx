import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientThread } from "@/components/requests/ClientThread";
import { isTokenFormat } from "@/lib/auth/password";
import { markRead, threadForClient } from "@/lib/requests/db";

export const metadata: Metadata = { title: "Ma demande de projet", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

/** Conversation du client avec le tatoueur (lien privé reçu par e-mail). */
export default async function ClientRequestPage({ params, searchParams }: PageProps<"/demande/[jeton]">) {
  const { jeton } = await params;
  if (!isTokenFormat(jeton) || !process.env.DATABASE_URL) notFound();
  const thread = await threadForClient(jeton).catch((e) => {
    console.error("[demandes] lecture impossible :", e);
    return null;
  });
  if (!thread) notFound();
  await markRead(thread.id, "client").catch(() => {});
  const { accountId: _a, artistEmail: _e, ...publicThread } = thread;
  void _a;
  void _e;
  const { envoye } = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted">
          ← Accueil
        </Link>
        {publicThread.artistSlug && (
          <Link href={`/tatoueurs/${publicThread.artistSlug}`} className="tap inline-flex h-11 items-center px-2 text-sm font-medium">
            Voir le profil
          </Link>
        )}
      </div>
      <ClientThread token={jeton} initial={publicThread} justSent={envoye === "1"} />
    </main>
  );
}
