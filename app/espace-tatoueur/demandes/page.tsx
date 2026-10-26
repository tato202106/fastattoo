import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/requests/ThreadView";
import { currentAccount } from "@/lib/accounts/session";
import { inboxFor, type InboxItem } from "@/lib/requests/db";

export const metadata: Metadata = { title: "Mes demandes", robots: { index: false } };
export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** Boîte de réception du tatoueur : les demandes de projets reçues. */
export default async function ArtistInboxPage() {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");
  let items: InboxItem[] = [];
  let failed = false;
  try {
    items = await inboxFor(account.id);
  } catch (e) {
    console.error("[demandes] boîte de réception :", e);
    failed = true;
  }
  return (
    <main className="mx-auto max-w-xl px-4 pt-safe pb-nav lg:pt-6">
      <Link href="/espace-tatoueur" className="tap -ml-2 inline-flex h-11 items-center gap-1 px-2 text-sm text-muted">
        ← Espace tatoueur
      </Link>
      <h1 className="font-display text-[30px] leading-tight font-bold">Mes demandes</h1>
      <p className="mt-1 text-sm text-muted">Les projets que les clients t&apos;envoient depuis ton profil. Tu reçois aussi un e-mail à chaque nouvelle demande.</p>

      {failed && <p className="mt-6 text-muted">Impossible de charger tes demandes. Réessaie dans un instant.</p>}
      {!failed && items.length === 0 && (
        <p className="mt-8 rounded-2xl bg-surface-2 p-5 text-center text-[15px]">
          Pas encore de demande. Elles arrivent ici dès qu&apos;un client clique sur « Demander un projet » sur ton profil.
        </p>
      )}
      <ul className="mt-5 space-y-2">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/espace-tatoueur/demandes/${i.id}`} className="tap block rounded-2xl bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <p className={i.unread ? "font-bold" : "font-semibold"}>
                  {i.unread && <span className="mr-2 inline-block size-2.5 rounded-full bg-accent align-middle" aria-label="Non lu" />}
                  {i.clientName}
                </p>
                <span className="text-xs text-muted">{day(i.updatedAt)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{i.lastMessage || i.description}</p>
              <div className="mt-2">
                <StatusBadge status={i.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
