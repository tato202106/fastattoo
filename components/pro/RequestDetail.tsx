"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProposeSlotSheet } from "@/components/chat/ProposeSlotSheet";
import { InitialsAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { formatShortDay, timeAgo } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { requestStatusFor } from "@/lib/store/labels";
import { TATTOO_SIZES } from "@/lib/store/model";
import { styleLabel, zoneLabel } from "@/lib/styles";

/** Détail d'une demande : Accepter / Répondre / Proposer un créneau (SPEC §22). */
export function RequestDetail({ id }: { id: string }) {
  const router = useRouter();
  const request = useApp((s) => s.requests.find((r) => r.id === id));
  const session = useApp((s) => s.session);
  const accept = useApp((s) => s.acceptRequest);
  const decline = useApp((s) => s.declineRequest);
  const [slotOpen, setSlotOpen] = useState(false);

  if (!request || request.artistId !== session?.userId) {
    return (
      <div className="p-6 text-center">
        <p className="font-semibold">Demande introuvable.</p>
        <Link href="/pro/demandes" className="mt-2 inline-block text-accent underline">
          Retour aux demandes
        </Link>
      </div>
    );
  }
  const r = request;
  const status = requestStatusFor(r.status, "artist");
  const open = r.status === "new" || r.status === "accepted";

  return (
    <div className="pb-[calc(100px+var(--safe-bottom))]">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-bg/95 px-2 pt-[calc(var(--safe-top)+6px)] pb-2 backdrop-blur-md">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="tap inline-flex size-11 items-center justify-center rounded-full">
          <Icon name="back" size={22} />
        </button>
        <h1 className="flex-1 text-lg font-semibold">Demande</h1>
        <span className={`mr-2 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
      </header>

      <div className="space-y-5 px-4">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={r.clientName} size={52} />
          <div>
            <p className="text-xl font-semibold">{r.clientName}</p>
            <p className="text-sm text-muted">Envoyée {timeAgo(r.createdAt)}</p>
          </div>
        </div>

        <p className="rounded-2xl bg-surface p-4 text-[16px] leading-relaxed shadow-card">{r.description}</p>

        <dl className="grid grid-cols-2 gap-3">
          {[
            ["Style", r.styles.map(styleLabel).join(", ")],
            ["Zone", zoneLabel(r.zone)],
            ["Taille", TATTOO_SIZES.find((s) => s.value === r.size)?.label ?? ""],
            ["Budget", `${r.budgetMin}–${r.budgetMax} €`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-border p-3">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
          <div className="col-span-2 rounded-2xl border border-border p-3">
            <dt className="text-xs text-muted">Dates préférées</dt>
            <dd className="font-semibold">{r.dates.length ? r.dates.map(formatShortDay).join(" · ") : "Flexible"}</dd>
          </div>
        </dl>

        {r.inspirations.length > 0 && (
          <section>
            <h2 className="mb-2 font-semibold">Inspirations</h2>
            <div className="grid grid-cols-3 gap-2">
              {r.inspirations.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                  <Picture image={img} usage="list" fill sizes="33vw" />
                </div>
              ))}
            </div>
          </section>
        )}

        {open && (
          <button type="button" onClick={() => decline(r.id)} className="text-sm font-medium text-muted underline underline-offset-4">
            Je ne suis pas disponible pour ce projet
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md lg:bottom-auto lg:static lg:mt-6 lg:border-0 lg:bg-transparent">
        <div className="mx-auto grid max-w-xl grid-cols-[auto_1fr] gap-2">
          {r.status === "new" ? (
            <Button variant="outline" size="lg" className="px-4" onClick={() => accept(r.id)}>
              <Icon name="check" size={20} /> Accepter
            </Button>
          ) : (
            <Link href={`/messages/${r.conversationId}`} className="tap inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-surface font-semibold">
              <Icon name="message" size={20} /> Répondre
            </Link>
          )}
          {open ? (
            <Button size="lg" className="min-w-0 px-3 text-[15px]" onClick={() => setSlotOpen(true)}>
              Proposer un créneau
            </Button>
          ) : (
            <Link href="/pro/calendrier" className="tap inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-fg font-semibold text-bg">
              Calendrier
            </Link>
          )}
          {r.status === "new" && (
            <Link href={`/messages/${r.conversationId}`} className="tap col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold">
              <Icon name="message" size={18} /> Répondre par message
            </Link>
          )}
        </div>
      </div>

      <ProposeSlotSheet open={slotOpen} onClose={() => setSlotOpen(false)} artistId={r.artistId} conversationId={r.conversationId} onSent={() => router.push(`/messages/${r.conversationId}`)} />
    </div>
  );
}
