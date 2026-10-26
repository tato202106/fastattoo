"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import type { Role } from "@/lib/store/model";

/** Espace tatoueur réel (compte + mot de passe + abonnement). */
const ARTIST_LOGIN_PATH = "/espace-tatoueur/connexion";

/**
 * Connexion simplifiée côté client (personne qui cherche un tatoueur) :
 * prénom + e-mail, la session reste sur l'appareil.
 * Les tatoueurs sont renvoyés vers leur vrai espace (/espace-tatoueur/connexion).
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useApp((s) => s.login);
  const [role, setRole] = useState<Role>("client");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login("client", name, email);
    router.replace(params.get("next") ?? "/");
  };

  return (
    <form onSubmit={submit} className="flex min-h-[calc(100dvh-40px)] flex-col">
      <div className="flex items-center justify-between">
        <Logo />
        <button type="button" onClick={() => router.back()} aria-label="Fermer" className="tap inline-flex size-11 items-center justify-center rounded-full">
          <Icon name="close" size={22} />
        </button>
      </div>
      <h1 className="font-display mt-8 text-[30px] leading-tight font-bold">Bienvenue 👋</h1>
      <p className="mt-1 text-muted">Tu es plutôt…</p>

      <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Type de compte">
        {(
          [
            ["client", "Je cherche un tatoueur", "search"],
            ["artist", "Je suis tatoueur·se", "edit"],
          ] as const
        ).map(([value, label, icon]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            onClick={() => {
              if (value === "artist") router.push(ARTIST_LOGIN_PATH);
              else setRole(value);
            }}
            className={clsx("tap flex h-32 flex-col justify-between rounded-2xl border-2 p-4 text-left", role === value ? "border-fg bg-surface" : "border-border bg-surface")}
          >
            <Icon name={icon} size={26} className={role === value ? "text-accent" : "text-muted"} />
            <span className="text-[15px] leading-tight font-semibold">{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Prénom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="toi@exemple.fr" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
        </label>
      </div>

      <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
        Pas de mot de passe : tes favoris et tes demandes restent sur cet appareil. Tu es tatoueur·se ?{" "}
        <a href={ARTIST_LOGIN_PATH} className="font-semibold text-accent underline underline-offset-2">
          Connecte-toi à ton espace tatoueur
        </a>
        .
      </p>

      <div className="mt-auto pt-6 pb-[var(--safe-bottom)]">
        <Button type="submit" size="lg" className="w-full" disabled={name.trim().length < 2}>
          Continuer
        </Button>
      </div>
    </form>
  );
}
