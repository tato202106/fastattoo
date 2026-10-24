"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { buttonClass } from "@/components/ui/Button";

const INPUT = "mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg";

async function post(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: res.ok, error: data.error };
  } catch {
    return { ok: false, error: "Connexion impossible. Vérifie ta connexion et réessaie." };
  }
}

function Shell({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-40px)] max-w-md flex-col px-4 pt-safe pb-10 lg:min-h-0 lg:pt-12">
      <div className="pt-4">
        <Logo />
      </div>
      <h1 className="mt-8 font-display text-[28px] leading-tight font-bold">{title}</h1>
      {intro && <p className="mt-2 text-[15px] text-muted">{intro}</p>}
      {children}
    </div>
  );
}

function PasswordInput({ name, autoComplete, label }: { name: string; autoComplete: string; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} className={`${INPUT} pr-24`} />
        <button type="button" onClick={() => setShow((v) => !v)} className="tap absolute top-2 right-1 h-11 rounded-lg px-3 text-sm font-medium text-muted">
          {show ? "Masquer" : "Afficher"}
        </button>
      </div>
    </div>
  );
}

/** Connexion à l'espace tatoueur. */
export function ArtistLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const r = await post("/api/compte/connexion", { email: fd.get("email"), password: fd.get("password") });
    if (r.ok) {
      router.replace("/espace-tatoueur");
      router.refresh();
      return;
    }
    setError(r.error ?? "Connexion impossible.");
    setBusy(false);
  }

  return (
    <Shell title="Espace tatoueur" intro="Connecte-toi pour modifier ton profil et gérer ton abonnement.">
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <input name="email" type="email" inputMode="email" required autoComplete="email" className={INPUT} />
        </label>
        <PasswordInput name="password" autoComplete="current-password" label="Mot de passe" />
        {error && <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={busy} className={buttonClass("primary", "lg", "w-full")}>
          {busy ? "Connexion…" : "Me connecter"}
        </button>
      </form>
      <div className="mt-6 space-y-3 text-center text-sm">
        <Link href="/espace-tatoueur/mot-de-passe-oublie" className="tap inline-flex min-h-11 items-center font-medium text-accent underline">
          Mot de passe oublié ?
        </Link>
        <p className="text-muted">
          Pas encore inscrit ?{" "}
          <Link href="/devenir-tatoueur" className="font-semibold text-fg underline">
            Rejoindre Fastattoo
          </Link>
        </p>
      </div>
    </Shell>
  );
}

/** Demande d'un lien pour choisir un nouveau mot de passe. */
export function ForgotPasswordForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setError(null);
    const r = await post("/api/compte/mot-de-passe-oublie", { email: fd.get("email") });
    if (r.ok) setState("sent");
    else {
      setError(r.error ?? "Envoi impossible.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <Shell title="Regarde tes e-mails" intro="Si un compte tatoueur correspond à cette adresse, tu vas recevoir un lien pour choisir ton mot de passe (valable 1 heure). Pense à regarder dans les spams.">
        <Link href="/espace-tatoueur/connexion" className={buttonClass("outline", "lg", "mt-8 w-full")}>
          Retour à la connexion
        </Link>
      </Shell>
    );
  }
  return (
    <Shell title="Mot de passe oublié" intro="Indique l'e-mail de ton inscription : on t'envoie un lien pour choisir un nouveau mot de passe.">
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <input name="email" type="email" inputMode="email" required autoComplete="email" className={INPUT} />
        </label>
        {error && <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={state === "sending"} className={buttonClass("primary", "lg", "w-full")}>
          {state === "sending" ? "Envoi…" : "Recevoir le lien"}
        </button>
      </form>
      <Link href="/espace-tatoueur/connexion" className="tap mt-6 inline-flex min-h-11 items-center justify-center text-sm font-medium text-muted underline">
        Retour à la connexion
      </Link>
    </Shell>
  );
}

/** Nouveau mot de passe depuis le lien reçu par e-mail. */
export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("jeton") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      setError("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await post("/api/compte/nouveau-mot-de-passe", { token, password: fd.get("password") });
    if (r.ok) {
      router.replace("/espace-tatoueur");
      router.refresh();
      return;
    }
    setError(r.error ?? "Enregistrement impossible.");
    setBusy(false);
  }

  return (
    <Shell title="Nouveau mot de passe" intro="8 caractères minimum.">
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <PasswordInput name="password" autoComplete="new-password" label="Nouveau mot de passe" />
        <PasswordInput name="confirm" autoComplete="new-password" label="Confirme le mot de passe" />
        {error && <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={busy} className={buttonClass("primary", "lg", "w-full")}>
          {busy ? "Enregistrement…" : "Enregistrer et me connecter"}
        </button>
      </form>
    </Shell>
  );
}
