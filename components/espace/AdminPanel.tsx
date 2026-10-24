"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Account } from "@/lib/accounts/db";
import { artistSlugFor } from "@/lib/accounts/profile";
import { styleLabel } from "@/lib/styles";

const STATUS: Record<Account["status"], { label: string; className: string }> = {
  submitted: { label: "À valider", className: "bg-accent text-accent-fg" },
  published: { label: "En ligne", className: "bg-success/15 text-success" },
  draft: { label: "Brouillon", className: "bg-surface-2 text-muted" },
  hidden: { label: "Retiré par l'équipe", className: "bg-surface-2 text-muted" },
};

const SUB: Record<string, string> = {
  active: "Abonnement actif",
  trialing: "Période d'essai",
  past_due: "Paiement en retard",
  unpaid: "Impayé",
  canceled: "Résilié",
  incomplete: "Paiement incomplet",
};

export function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/connexion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }),
    }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      return;
    }
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setError(data?.error ?? "Connexion impossible.");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-6">
      <h1 className="font-display text-[28px] font-bold">Validation des profils</h1>
      <label className="block">
        <span className="text-sm font-medium">Mot de passe admin</span>
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
      </label>
      {error && <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Connexion…" : "Entrer"}
      </Button>
    </form>
  );
}

export function AdminPanel({ initial, error }: { initial: Account[]; error: string | null }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(error);
  const pending = accounts.filter((a) => a.status === "submitted").length;

  async function act(id: number, action: "publish" | "unpublish") {
    if (action === "unpublish" && !window.confirm("Retirer ce profil du site ?")) return;
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/comptes/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = (await res.json().catch(() => ({}))) as { account?: Account; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error ?? "Action impossible");
      setAccounts((list) => list.map((a) => (a.id === id ? data.account! : a)));
      setMessage(action === "publish" ? `${data.account.name} est en ligne (visible sur le site d'ici une minute).` : `${data.account.name} a été retiré du site.`);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/connexion", { method: "DELETE" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="space-y-6 pt-6 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] leading-tight font-bold">Validation des profils</h1>
          <p className="text-sm text-muted">
            {pending} à valider · {accounts.length} compte{accounts.length > 1 ? "s" : ""}
          </p>
        </div>
        <button type="button" onClick={logout} className="tap inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-medium">
          Quitter
        </button>
      </header>
      {message && <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm">{message}</p>}
      {accounts.length === 0 && <p className="text-muted">Aucun compte tatoueur pour l&apos;instant.</p>}
      <ul className="space-y-4">
        {accounts.map((a) => (
          <li key={a.id} className="rounded-2xl bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[a.status].className)}>{STATUS[a.status].label}</span>
              <span className="text-xs text-muted">{a.subscriptionStatus ? (SUB[a.subscriptionStatus] ?? a.subscriptionStatus) : "Pas d'abonnement"}</span>
            </div>
            <p className="mt-2 text-lg font-semibold">
              {a.name || "(sans nom)"} <span className="font-normal text-muted">· {a.title}</span>
            </p>
            <p className="text-sm text-muted">
              {[a.studio, a.address, a.city].filter(Boolean).join(" · ") || "Adresse non renseignée"}
              {a.lat == null && " · ⚠️ pas encore localisé"}
            </p>
            <p className="mt-1 text-sm">
              <a href={`mailto:${a.email}`} className="underline">
                {a.email}
              </a>
              {a.instagram && (
                <>
                  {" · "}
                  <a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noopener" className="underline">
                    @{a.instagram}
                  </a>
                </>
              )}
            </p>
            {a.styles.length > 0 && <p className="mt-2 text-sm">{a.styles.map(styleLabel).join(", ")}</p>}
            <p className="mt-1 text-sm">
              {a.priceFrom ? `Dès ${a.priceFrom} €` : "Prix non renseigné"}
              {a.hourlyRate ? ` · ${a.hourlyRate} €/h` : ""}
            </p>
            {a.bio && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-line">{a.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {a.status !== "published" ? (
                <Button disabled={busy === a.id || a.lat == null} onClick={() => act(a.id, "publish")}>
                  {busy === a.id ? "…" : a.status === "hidden" ? "Remettre en ligne" : "Mettre en ligne"}
                </Button>
              ) : (
                <>
                  <Link href={`/tatoueurs/${artistSlugFor(a.id, a.name, a.city)}`} className="tap inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold">
                    Voir le profil
                  </Link>
                  <Button variant="outline" disabled={busy === a.id} onClick={() => act(a.id, "unpublish")}>
                    Retirer du site
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
