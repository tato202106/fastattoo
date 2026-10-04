"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { formatTime, relativeDay } from "@/lib/dates";
import { upcomingAppointments, useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import { requestStatusFor } from "@/lib/store/labels";
import { styleLabel } from "@/lib/styles";
import type { ArtistCard } from "@/lib/types";

/** Espace client sur l'accueil (SPEC §18) : bonjour, prochain RDV, demandes, favoris. */
export function ClientDashboard() {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const appointments = useApp((s) => s.appointments);
  const requests = useApp((s) => s.requests);
  const favorites = useApp((s) => s.favorites);
  const conversations = useApp((s) => s.conversations);
  const [favCards, setFavCards] = useState<ArtistCard[]>([]);

  useEffect(() => {
    if (!hydrated || favorites.length === 0) return;
    const ctrl = new AbortController();
    fetch(`/api/artists/cards?ids=${favorites.slice(0, 10).join(",")}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ cards: ArtistCard[] }>)
      .then((d) => setFavCards(d.cards))
      .catch(() => {});
    return () => ctrl.abort();
  }, [hydrated, favorites]);

  if (!hydrated || session?.role !== "client") return null;

  const next = upcomingAppointments(appointments, (a) => a.clientId === session.userId)[0];
  const myRequests = requests.filter((r) => r.clientId === session.userId).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="space-y-5" aria-label="Mon espace">
      <h1 className="font-display text-[30px] leading-tight font-bold">Bonjour {session.name.split(" ")[0]} 👋</h1>

      {next ? (
        <Link href={next.conversationId ? `/messages/${next.conversationId}` : "/messages"} className="tap block rounded-[var(--radius-card)] bg-fg p-4 text-bg shadow-card">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-70">Ton prochain rendez-vous</p>
          <p className="mt-1 text-2xl font-bold">
            {relativeDay(next.date)} · {formatTime(next.time)}
          </p>
          <p className="mt-0.5 text-sm opacity-80">
            {next.artistName} · {next.label}
          </p>
        </Link>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border p-4 text-sm text-muted">Pas encore de rendez-vous. Trouve ton tatoueur ci-dessous ✨</div>
      )}

      {myRequests.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tes demandes</h2>
            <Link href="/messages" className="text-sm font-medium text-muted">
              Tout voir
            </Link>
          </div>
          <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
            {myRequests.slice(0, 6).map((r) => {
              const conv = conversations.find((c) => c.id === r.conversationId);
              const status = requestStatusFor(r.status, "client");
              return (
                <li key={r.id} className="w-[78%] max-w-xs shrink-0 snap-start">
                  <Link href={`/messages/${r.conversationId}`} className="tap flex h-full flex-col gap-2 rounded-2xl bg-surface p-3 shadow-card">
                    <div className="flex items-center gap-2">
                      {conv && <Avatar image={conv.artistAvatar} size={32} />}
                      <span className="flex-1 truncate text-sm font-semibold">{r.artistName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="line-clamp-2 text-sm text-fg/80">{r.description}</p>
                    <p className="mt-auto text-xs text-muted">{r.styles.map(styleLabel).join(", ")}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {favCards.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tes favoris</h2>
            <Link href="/favoris" className="text-sm font-medium text-muted">
              Tout voir
            </Link>
          </div>
          <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">
            {favCards.map((a) => (
              <li key={a.id} className="w-32 shrink-0">
                <Link href={`/tatoueurs/${a.slug}`} className="tap block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
                    {a.previews[0] && <Picture image={a.previews[0]} usage="list" fill />}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold">{a.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    <Icon name="star" size={12} className="text-star" /> {a.rating.toFixed(1).replace(".", ",")} · {a.city}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
