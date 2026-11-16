"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Rating";
import type { AdminReview } from "@/lib/accounts/reviews-db";

const formatDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** Modération des avis clients : les plus récents d'abord, « Retirer du site » pour un avis insultant ou faux. */
export function AdminReviews({ initial }: { initial: AdminReview[] }) {
  const [reviews, setReviews] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(id: number, action: "hide" | "show") {
    if (action === "hide" && !window.confirm("Retirer cet avis du site ? La note du tatoueur sera recalculée sans lui.")) return;
    setBusy(id);
    setMessage(null);
    const res = await fetch(`/api/admin/avis/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { review?: AdminReview; error?: string } | undefined;
    if (res?.ok && data?.review) setReviews((list) => list.map((r) => (r.id === id ? data.review! : r)));
    else setMessage(data?.error ?? "Action impossible.");
    setBusy(null);
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-[24px] font-bold">Avis clients</h2>
      {message && <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm">{message}</p>}
      {reviews.length === 0 ? (
        <p className="text-muted">Aucun avis client pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className={clsx("rounded-2xl bg-surface p-4 shadow-card", r.hidden && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="text-sm font-semibold">{r.author}</span>
                <span className="text-sm text-muted">
                  pour {r.artistName || "(sans nom)"} · {formatDate(r.createdAt)}
                </span>
                {r.hidden && <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-muted">Retiré</span>}
              </div>
              {r.text && <p className="mt-2 text-sm whitespace-pre-line">{r.text}</p>}
              {r.reply && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-line">↳ {r.reply}</p>}
              <div className="mt-3">
                <Button variant="outline" size="sm" disabled={busy === r.id} onClick={() => act(r.id, r.hidden ? "show" : "hide")}>
                  {busy === r.id ? "…" : r.hidden ? "Remettre sur le site" : "Retirer du site"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
