"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const LABELS = ["", "Décevant", "Moyen", "Bien", "Très bien", "Parfait"];
const TEXT_MAX = 1000;

/** Formulaire d'avis du client : note de 1 à 5, commentaire facultatif, prénom affiché. */
export function ReviewForm({ token, suggestedAuthor }: { token: string; suggestedAuthor: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(suggestedAuthor);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Choisis une note de 1 à 5 étoiles.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/avis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, rating, text, author }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; errors?: Record<string, string> } | undefined;
    if (res?.ok) setDone(true);
    else setError(data?.error ?? Object.values(data?.errors ?? {})[0] ?? "Envoi impossible. Réessaie dans un instant.");
    setBusy(false);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-2xl bg-success/10 p-4">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Icon name="check" size={20} strokeWidth={3} /> Merci pour ton avis !
        </p>
        <p className="mt-1 text-[15px]">Il apparaît sur le profil de ton tatoueur d&apos;ici une minute et aide les autres clients à choisir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <fieldset>
        <legend className="text-sm font-medium">Ta note</legend>
        <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} étoile${n > 1 ? "s" : ""} : ${LABELS[n]}`}
              onClick={() => setRating(n)}
              className="tap inline-flex size-12 items-center justify-center rounded-xl"
            >
              <Icon name="star" size={32} strokeWidth={1.5} filled={n <= rating} className={clsx(n <= rating ? "text-star" : "text-border")} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm text-muted" aria-live="polite">
          {LABELS[rating]}
        </p>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Ton commentaire (facultatif)</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
          rows={5}
          placeholder="L'accueil, le dessin, l'hygiène, le résultat…"
          className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-[15px] outline-none focus:border-fg"
        />
        <span className="block text-right text-xs text-muted">
          {text.length} / {TEXT_MAX}
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Nom affiché</span>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value.slice(0, 40))}
          required
          minLength={2}
          autoComplete="given-name"
          className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg"
        />
        <span className="mt-1 block text-xs text-muted">Ton prénom et l&apos;initiale de ton nom suffisent.</span>
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Envoi…" : "Publier mon avis"}
      </Button>
    </form>
  );
}
