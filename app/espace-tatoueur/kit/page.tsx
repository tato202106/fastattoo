import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShareKit } from "@/components/espace/ShareKit";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { currentAccount } from "@/lib/accounts/session";
import { encodeQr, qrPath } from "@/lib/qr";
import { shareKitFor } from "@/lib/share-kit-server";

export const metadata: Metadata = { title: "Kit de partage", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ShareKitPage() {
  const account = await currentAccount();
  if (!account) redirect("/espace-tatoueur/connexion");

  const header = (
    <header className="pt-4">
      <Link href="/espace-tatoueur" className="tap -ml-1 inline-flex items-center gap-1 text-sm text-muted">
        <Icon name="back" size={16} /> Mon espace
      </Link>
      <h1 className="mt-2 font-display text-[30px] leading-tight font-bold">Kit de partage</h1>
      <p className="mt-1 text-[15px] text-muted">
        Fais venir tes clients et tes abonnés sur ton profil : plus il reçoit de visites et d&apos;avis, mieux il est classé sur la carte.
      </p>
    </header>
  );

  if (account.status !== "published") {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-4 pt-safe pb-nav lg:pt-6">
        {header}
        <section className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="font-semibold">Ton profil n&apos;est pas en ligne</p>
          <p className="mt-1 text-sm text-muted">Le kit de partage sera prêt dès que ton profil sera visible sur la carte.</p>
          <Link href="/espace-tatoueur" className={buttonClass("primary", "lg", "mt-3 w-full")}>
            Retour à mon espace
          </Link>
        </section>
      </main>
    );
  }

  const kit = await shareKitFor(account);
  const qr = encodeQr(kit.links.qr);
  return (
    <main className="mx-auto max-w-xl space-y-8 px-4 pt-safe pb-nav lg:pt-6">
      {header}
      <ShareKit
        name={account.name}
        place={[account.studio, account.city].filter(Boolean).join(" · ")}
        profileUrl={kit.profileUrl}
        links={kit.links}
        texts={kit.texts}
        qr={{ path: qrPath(qr, 4), size: qr.length + 8 }}
      />
    </main>
  );
}
