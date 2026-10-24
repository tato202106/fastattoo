"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubscribedView } from "@/components/billing/SignupConfirmation";
import { buttonClass, Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { Account } from "@/lib/accounts/db";
import { artistSlugFor, missingForSubmission } from "@/lib/accounts/profile";
import type { PlanId } from "@/lib/billing/plans";
import { ProfileForm } from "./ProfileForm";

/** Espace d'un tatoueur connecté : statut du profil, profil modifiable, abonnement. */
export function ArtistSpace({ initial, welcome }: { initial: Account; welcome: boolean }) {
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
          <p className="mt-1 text-[15px]">Ton abonnement est actif. Complète ton profil ci-dessous, puis envoie-le : on le vérifie et on le met en ligne.</p>
        </div>
      )}

      <StatusCard account={account} onChange={setAccount} />

      <section aria-labelledby="profil" className="space-y-4">
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

function StatusCard({ account, onChange }: { account: Account; onChange: (a: Account) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = missingForSubmission(account);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compte/envoyer", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { account?: Account; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error ?? "Envoi impossible.");
      onChange(data.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (account.status === "published") {
    return (
      <section className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Icon name="verified" size={20} /> Ton profil est en ligne
        </p>
        <p className="mt-1 text-sm text-muted">Les modifications que tu enregistres apparaissent sur le site en une minute environ.</p>
        <Link href={`/tatoueurs/${artistSlugFor(account.id, account.name, account.city)}`} className={buttonClass("outline", "md", "mt-3 w-full")}>
          Voir mon profil public
        </Link>
      </section>
    );
  }
  if (account.status === "submitted") {
    return (
      <section className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="clock" size={20} /> Profil en cours de validation
        </p>
        <p className="mt-1 text-sm text-muted">On vérifie ton profil et on le met en ligne rapidement. Tu peux encore le modifier en attendant.</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="edit" size={20} /> Profil pas encore en ligne
      </p>
      {missing.length > 0 ? (
        <p className="mt-1 text-sm text-muted">
          Pour l&apos;envoyer, complète et enregistre : <strong className="font-medium text-fg">{missing.join(", ")}</strong>.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">Tout est prêt : envoie ton profil, on le vérifie avant de le mettre en ligne.</p>
      )}
      {error && <p className="mt-2 text-sm text-accent">{error}</p>}
      <Button className="mt-3 w-full" size="lg" disabled={busy || missing.length > 0} onClick={submit}>
        {busy ? "Envoi…" : "Envoyer mon profil pour validation"}
      </Button>
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
        <Link href="/espace-tatoueur/abonnement" className={buttonClass("primary", "lg", "mt-3 w-full")}>
          Activer mon abonnement
        </Link>
      </div>
    );
  }
  const s = data.subscription;
  return <SubscribedView initial={{ plan: s.plan, renewsAt: s.renewsAt, trialEndsAt: s.trialEndsAt, status: s.status, cancelAtPeriodEnd: s.cancelAtPeriodEnd }} returnTo="espace" />;
}
