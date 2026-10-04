"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import type { Role } from "@/lib/store/model";

/**
 * Inscription / connexion simplifiée : un choix de profil + prénom + e-mail.
 * ⚠️ Démo : pas de mot de passe ni de vérification, la session reste sur l'appareil.
 * En production : lien magique par e-mail ou OAuth (Apple / Google).
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useApp((s) => s.login);
  const artistProfile = useApp((s) => s.artistProfile);
  const [role, setRole] = useState<Role>(params.get("role") === "artist" ? "artist" : "client");
  const [name, setName] = useState(role === "artist" ? "Léa" : "Thomas");
  const [email, setEmail] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role, name, email);
    if (role === "artist") router.replace(artistProfile?.onboarded ? "/pro" : "/pro/onboarding");
    else router.replace(params.get("next") ?? "/");
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
              setRole(value);
              setName(value === "artist" ? "Léa" : "Thomas");
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
          <span className="text-sm font-medium">Prénom{role === "artist" ? " ou nom d'artiste" : ""}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="toi@exemple.fr" className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
        </label>
      </div>

      <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
        Version de démonstration : pas de mot de passe, tes données restent sur cet appareil.
        {role === "artist" && " Tu seras connecté·e au compte de démo « Léa Ink » (Nantes)."}
      </p>

      <div className="mt-auto pt-6 pb-[var(--safe-bottom)]">
        <Button type="submit" size="lg" className="w-full" disabled={name.trim().length < 2}>
          Continuer
        </Button>
      </div>
    </form>
  );
}
