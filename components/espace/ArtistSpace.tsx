"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubscribedView } from "@/components/billing/SignupConfirmation";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { Account } from "@/lib/accounts/db";
import { artistSlugFor, missingForSubmission } from "@/lib/accounts/profile";
import { PAYMENT_PATH } from "@/lib/billing/access";
import type { PlanId } from "@/lib/billing/plans";
import type { PortfolioItem } from "@/lib/types";
import { PhotosManager } from "./PhotosManager";
import { ProfileForm } from "./ProfileForm";

/** Espace d'un tatoueur connecté : statut du profil, photos, profil modifiable, abonnement. */
export function ArtistSpace({ initial, photos, paid, welcome }: { initial: Account; photos: PortfolioItem[]; paid: boolean; welcome: boolean }) {
  const router = useRouter();
  const [account, setAccount] = useState(initial);

  async function logout() {
    await fetch("/api/compte/deconnexion", { method: "POST" }).catch(() => {});
    router.replace("/espace-tatoueur/connexion");
    router.refresh();
  }

  return (
    <div className="space-y-8 pb-10">
      <header className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">Espace tatoueur</p>
          <h1 className="truncate font-display text-[30px] leading-tight font-bold">{account.name || "Mon profil"}</h1>
          <p className="truncate text-sm text-muted">{account.email}</p>
        </div>
        <button type="button" onClick={logout} className="tap inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium">
          <Icon name="logout" size={16} /> Déconnexion
        </button>
      </header>

      {welcome && (
        <div className="rounded-2xl bg-success/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-success">
            <Icon name="check" size={20} strokeWidth={3} /> Bienvenue sur Fastattoo !
          </p>
          <p className="mt-1 text-[15px]">
            Ton abonnement est actif{account.status === "published" ? " et ton profil est déjà en ligne sur la carte" : ""}. Ajoute tes photos au fur et à mesure et
            complète ton profil quand tu veux.
          </p>
        </div>
      )}

      <StatusCard account={account} paid={paid} />

      <section aria-labelledby="photos" className="space-y-4">
        <h2 id="photos" className="font-display text-[24px] font-bold">
          Mes photos
        </h2>
        <PhotosManager initial={photos} styles={account.styles} published={account.status === "published"} />
      </section>

      <section aria-labelledby="profil" className="scroll-mt-4 space-y-4">
        <h2 id="profil" className="font-display text-[24px] font-bold">
          Mon profil
        </h2>
        <ProfileForm account={account} onSaved={setAccount} />
      </section>

      <section aria-labelledby="abonnement" className="space-y-4">
        <h2 id="abonnement" className="font-display text-[24px] font-bold">
          Mon abonnement
        </h2>
        <SubscriptionSection />
      </section>
    </div>
  );
}

function StatusCard({ account, paid }: { account: Account; paid: boolean }) {
  const tips = missingForSubmission(account).filter((m) => !m.startsWith("ta ville"));

  if (account.status === "published") {
    return (
      <section className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Icon name="verified" size={20} /> Ton profil est en ligne
        </p>
        <p className="mt-1 text-sm text-muted">
          Il est visible sur la carte et dans la recherche. Tes modifications et tes nouvelles photos apparaissent sur le site en une minute environ.
        </p>
        {tips.length > 0 && (
          <p className="mt-2 text-sm text-muted">
            Pour donner envie aux clients, ajoute : <strong className="font-medium text-fg">{tips.join(", ")}</strong>.
          </p>
        )}
        <Link href={`/tatoueurs/${artistSlugFor(account.id, account.name, account.city)}`} className={buttonClass("outline", "md", "mt-3 w-full")}>
          Voir mon profil public
        </Link>
      </section>
    );
  }
  if (account.status === "hidden") {
    return (
      <section className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="close" size={20} /> Profil retiré du site
        </p>
        <p className="mt-1 text-sm text-muted">L&apos;équipe Fastattoo a retiré ton profil du site. Réponds à notre e-mail ou écris-nous pour en savoir plus.</p>
      </section>
    );
  }
  if (!paid) {
    return (
      <section className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="lock" size={20} /> Profil pas encore en ligne
        </p>
        <p className="mt-1 text-sm text-muted">Active ton abonnement : ton profil est mis en ligne sur la carte aussitôt le paiement validé.</p>
        <Link href={PAYMENT_PATH} className={buttonClass("primary", "lg", "mt-3 w-full")}>
          Activer mon abonnement
        </Link>
      </section>
    );
  }
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="pin" size={20} /> Encore une info pour apparaître sur la carte
      </p>
      <p className="mt-1 text-sm text-muted">
        On n&apos;a pas réussi à situer ton studio. Indique ta ville ou l&apos;adresse de ton studio dans « Mon profil » ci-dessous et enregistre : ton profil
        sera mis en ligne aussitôt.
      </p>
      <a href="#profil" className={buttonClass("primary", "lg", "mt-3 w-full")}>
        Compléter mon adresse
      </a>
    </section>
  );
}

type SubData = {
  mode?: string;
  subscription: { plan: PlanId; status: string; renewsAt: string | null; trialEndsAt: string | null; cancelAtPeriodEnd?: boolean } | null;
};

function SubscriptionSection() {
  const [data, setData] = useState<SubData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/billing/subscription")
      .then((r) => (r.ok ? (r.json() as Promise<SubData>) : Promise.reject()))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-muted">Impossible de charger ton abonnement. Réessaie dans un instant.</p>;
  if (!data) return <div className="skeleton h-32 rounded-2xl" aria-label="Chargement" />;
  if (data.mode === "demo") return <p className="rounded-2xl bg-surface-2 p-4 text-[15px]">Le paiement en ligne n&apos;est pas encore activé : on te recontacte par e-mail.</p>;
  if (!data.subscription) {
    return (
      <div className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="font-semibold">Aucun abonnement actif</p>
        <p className="mt-1 text-sm text-muted">Active ton abonnement pour que ton profil puisse être mis en ligne.</p>
        <Link href="/devenir-tatoueur/paiement" className={buttonClass("primary", "lg", "mt-3 w-full")}>
          Activer mon abonnement
        </Link>
      </div>
    );
  }
  const s = data.subscription;
  return <SubscribedView initial={{ plan: s.plan, renewsAt: s.renewsAt, trialEndsAt: s.trialEndsAt, status: s.status, cancelAtPeriodEnd: s.cancelAtPeriodEnd }} returnTo="espace" />;
}
