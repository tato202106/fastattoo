"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ARTIST_TITLES, type ProfileErrors } from "@/lib/accounts/profile";
import type { Account } from "@/lib/accounts/db";
import { COUNTRIES } from "@/lib/countries";
import { STYLES } from "@/lib/styles";
import type { StyleSlug } from "@/lib/types";

const INPUT = "mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg";

function Field({ label, error, hint, optional, children }: { label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {optional && <span className="font-normal text-muted"> (facultatif)</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm text-accent">{error}</span>}
    </label>
  );
}

/** Formulaire du profil public, dans l'espace tatoueur. */
export function ProfileForm({ account, onSaved }: { account: Account; onSaved: (a: Account) => void }) {
  const [styles, setStyles] = useState<StyleSlug[]>(account.styles);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), styles };
    setStatus("saving");
    setErrors({});
    try {
      const res = await fetch("/api/compte/profil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await res.json().catch(() => ({}))) as { account?: Account; errors?: ProfileErrors; error?: string };
      if (res.ok && data.account) {
        onSaved(data.account);
        setStatus("saved");
        return;
      }
      setErrors(data.errors ?? {});
      setMessage(data.error ?? "Certains champs sont à corriger.");
      setStatus("error");
    } catch {
      setMessage("Connexion impossible. Vérifie ta connexion et réessaie.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} onChange={() => status === "saved" && setStatus("idle")} noValidate className="space-y-4">
      <Field label="Nom ou nom d'artiste" error={errors.name}>
        <input name="name" required defaultValue={account.name} autoComplete="name" className={INPUT} />
      </Field>
      <Field label="Tu te présentes comme">
        <select name="title" defaultValue={account.title} className={INPUT}>
          {ARTIST_TITLES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Nom du studio" optional>
        <input name="studio" defaultValue={account.studio} autoComplete="organization" className={INPUT} />
      </Field>
      <Field label="Adresse du studio" error={errors.address} hint="Sert à te placer sur la carte." optional>
        <input name="address" defaultValue={account.address} autoComplete="street-address" className={INPUT} />
      </Field>
      <Field label="Ville" error={errors.city}>
        <input name="city" required defaultValue={account.city} autoComplete="address-level2" className={INPUT} />
      </Field>
      <Field label="Pays" error={errors.country}>
        <select name="country" defaultValue={account.country} autoComplete="country" className={INPUT}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Styles pratiqués</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLES.map((s) => {
            const on = styles.includes(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setStyles((cur) => (on ? cur.filter((x) => x !== s.slug) : [...cur, s.slug]));
                  if (status === "saved") setStatus("idle");
                }}
                className={clsx("tap inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium", on ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {errors.styles && <span className="mt-1 block text-sm text-accent">{errors.styles}</span>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix de départ (€)">
          <input name="priceFrom" type="number" inputMode="numeric" min={1} defaultValue={account.priceFrom ?? ""} className={INPUT} />
        </Field>
        <Field label="Tarif horaire (€)" optional>
          <input name="hourlyRate" type="number" inputMode="numeric" min={1} defaultValue={account.hourlyRate ?? ""} className={INPUT} />
        </Field>
      </div>
      <Field label="Présentation" hint="Ton parcours, ton univers, ce que tu aimes tatouer (affiché sur ton profil).">
        <textarea name="bio" rows={6} maxLength={1500} defaultValue={account.bio} className="mt-1 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-fg" />
      </Field>
      <Field label="Instagram" optional>
        <input name="instagram" defaultValue={account.instagram ? `@${account.instagram}` : ""} placeholder="@ton.compte" autoCapitalize="none" className={INPUT} />
      </Field>

      {status === "error" && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
          {message}
        </p>
      )}
      {status === "saved" && (
        <p role="status" className="rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
          Profil enregistré{account.status === "published" ? " et mis à jour sur le site" : ""}.
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={status === "saving"}>
        {status === "saving" ? "Enregistrement…" : "Enregistrer mon profil"}
      </Button>
    </form>
  );
}
