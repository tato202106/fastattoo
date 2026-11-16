"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InitialsAvatar } from "@/components/ui/Avatar";
import { Rating, Stars } from "@/components/ui/Rating";
import type { AccountReview } from "@/lib/accounts/reviews-db";

const formatDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

/** Avis reçus par le tatoueur, avec sa réponse publique. */
export function ReviewsManager() {
  const [reviews, setReviews] = useState<AccountReview[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/compte/avis", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ reviews: AccountReview[] }>) : Promise.reject()))
      .then((d) => setReviews(d.reviews))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-muted">Impossible de charger tes avis. Réessaie dans un instant.</p>;
  if (!reviews) return <div className="skeleton h-24 rounded-2xl" aria-label="Chargement" />;
  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl bg-surface-2 p-4 text-[15px]">
        Pas encore d&apos;avis. Note tes rendez-vous dans ton agenda avec l&apos;e-mail du client : le lendemain, on lui demande son avis à ta place.
      </p>
    );
  }
  const shown = reviews.filter((r) => !r.hidden);
  const average = shown.length ? shown.reduce((s, r) => s + r.rating, 0) / shown.length : 0;
  return (
    <div className="space-y-4">
      {shown.length > 0 && (
        <p className="flex items-center gap-2 text-[15px]">
          <Rating value={average} size={18} /> <span className="text-muted">· {shown.length} avis sur ton profil</span>
        </p>
      )}
      <ul className="space-y-4">
        {reviews.map((r) => (
          <ReviewItem key={r.id} review={r} onChange={(u) => setReviews((list) => list!.map((x) => (x.id === u.id ? u : x)))} />
        ))}
      </ul>
    </div>
  );
}

function ReviewItem({ review, onChange }: { review: AccountReview; onChange: (r: AccountReview) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.reply ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(reply: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/compte/avis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: review.id, reply }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { review?: AccountReview; error?: string } | undefined;
    if (res?.ok && data?.review) {
      onChange(data.review);
      setEditing(false);
    } else setError(data?.error ?? "Enregistrement impossible. Réessaie dans un instant.");
    setBusy(false);
  }

  return (
    <li className="rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-center gap-3">
        <InitialsAvatar name={review.author} size={36} />
        <div className="flex-1">
          <p className="text-sm font-semibold">{review.author}</p>
          <p className="text-xs text-muted">{formatDate(review.createdAt)}</p>
        </div>
        <Stars value={review.rating} />
      </div>
      {review.hidden && <p className="mt-2 text-xs font-semibold text-muted">Retiré du site par l&apos;équipe Fastattoo</p>}
      {review.text && <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{review.text}</p>}

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 600))}
            rows={3}
            placeholder="Merci pour ta confiance !"
            className="w-full rounded-xl border border-border bg-surface p-3 text-[15px] outline-none focus:border-fg"
          />
          {error && (
            <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => save(draft)}>
              {busy ? "…" : "Publier ma réponse"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : review.reply ? (
        <div className="mt-3 rounded-xl bg-surface-2 p-3">
          <p className="text-xs font-semibold text-muted">Ta réponse</p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{review.reply}</p>
          <div className="mt-2 flex gap-4 text-sm">
            <button type="button" className="tap underline underline-offset-4" onClick={() => setEditing(true)}>
              Modifier
            </button>
            <button type="button" className="tap text-muted underline underline-offset-4" disabled={busy} onClick={() => save("")}>
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="tap mt-3 inline-flex h-11 items-center text-sm font-semibold underline underline-offset-4" onClick={() => setEditing(true)}>
          Répondre publiquement
        </button>
      )}
    </li>
  );
}
