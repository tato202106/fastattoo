"use client";

import clsx from "clsx";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { clockTime, formatLongDate, formatShortDay, formatTime } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { requestStatusFor } from "@/lib/store/labels";
import { TATTOO_SIZES, type Conversation, type Message } from "@/lib/store/model";
import { styleLabel, zoneLabel } from "@/lib/styles";

/** Rendu d'un message selon son type : texte, photo, référence, prix, proposition, demande. */
export function MessageBubble({ message, conversation, side, onProposeSlot }: { message: Message; conversation: Conversation; side: "client" | "artist"; onProposeSlot: () => void }) {
  const mine = message.from === side;
  const requests = useApp((s) => s.requests);
  const respond = useApp((s) => s.respondToProposal);
  const accept = useApp((s) => s.acceptRequest);

  if (message.from === "system") {
    return (
      <p className="my-2 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-muted">
        <Icon name="check" size={14} /> {message.kind === "text" ? message.text : ""}
      </p>
    );
  }

  const time = <span className={clsx("mt-1 block text-[11px]", mine ? "text-right opacity-70" : "text-muted")}>{clockTime(message.at)}</span>;
  const align = clsx("flex", mine ? "justify-end" : "justify-start");

  switch (message.kind) {
    case "text":
      return (
        <div className={align}>
          <div className={clsx("max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap", mine ? "rounded-br-lg bg-fg text-bg" : "rounded-bl-lg bg-surface shadow-card")}>
            {message.text}
            {time}
          </div>
        </div>
      );
    case "photo":
    case "reference":
      return (
        <div className={align}>
          <figure className={clsx("w-[62%] max-w-64 overflow-hidden rounded-3xl", mine ? "rounded-br-lg bg-fg text-bg" : "rounded-bl-lg bg-surface shadow-card")}>
            <Picture image={message.image} usage="profile" sizes="260px" />
            <figcaption className="px-3 py-2 text-sm">
              {message.kind === "reference" && (
                <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold opacity-70">
                  <Icon name="link" size={13} /> Référence
                </span>
              )}
              {message.text}
              {time}
            </figcaption>
          </figure>
        </div>
      );
    case "price":
      return (
        <div className={align}>
          <div className="w-[78%] max-w-72 rounded-3xl border border-border bg-surface p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              <Icon name="euro" size={14} /> Devis
            </p>
            <p className="mt-1 text-3xl font-bold">{message.amount} €</p>
            <p className="text-sm text-muted">{message.label}</p>
            {time}
          </div>
        </div>
      );
    case "proposal": {
      const p = message.proposal;
      return (
        <div className={align}>
          <div className="w-[82%] max-w-80 rounded-3xl border border-border bg-surface p-4 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
              <Icon name="calendar" size={14} /> Proposition de rendez-vous
            </p>
            <p className="mt-1 text-lg font-bold first-letter:uppercase">{formatLongDate(p.date)}</p>
            <p className="text-[15px]">
              {formatTime(p.time)} · {p.durationH} h
            </p>
            {p.status === "pending" && side === "client" && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => respond(conversation.id, message.id, false)}>
                  Refuser
                </Button>
                <Button className="flex-1" onClick={() => respond(conversation.id, message.id, true)}>
                  Accepter
                </Button>
              </div>
            )}
            {p.status === "pending" && side === "artist" && <p className="mt-2 text-sm text-muted">En attente de réponse…</p>}
            {p.status === "accepted" && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-sm font-semibold text-success">
                <Icon name="check" size={15} /> Confirmé
              </p>
            )}
            {p.status === "declined" && <p className="mt-2 text-sm font-semibold text-muted">Refusé</p>}
            {time}
          </div>
        </div>
      );
    }
    case "request": {
      const r = requests.find((x) => x.id === message.requestId);
      if (!r) return null;
      const status = requestStatusFor(r.status, side);
      return (
        <div className={align}>
          <div className="w-[88%] max-w-96 rounded-3xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Demande de projet</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
            </div>
            <p className="mt-2 text-[15px] leading-snug">{r.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-muted">Style</dt>
              <dd>{r.styles.map(styleLabel).join(", ")}</dd>
              <dt className="text-muted">Zone</dt>
              <dd>{zoneLabel(r.zone)}</dd>
              <dt className="text-muted">Taille</dt>
              <dd>{TATTOO_SIZES.find((s) => s.value === r.size)?.label}</dd>
              <dt className="text-muted">Budget</dt>
              <dd>
                {r.budgetMin}–{r.budgetMax} €
              </dd>
              <dt className="text-muted">Quand</dt>
              <dd>{r.dates.length ? r.dates.map(formatShortDay).join(", ") : "Flexible"}</dd>
            </dl>
            {r.inspirations.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {r.inspirations.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl">
                    <Picture image={img} usage="list" fill sizes="80px" />
                  </div>
                ))}
              </div>
            )}
            {side === "artist" && r.status === "new" && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => accept(r.id)}>
                  Accepter
                </Button>
                <Button className="flex-1" onClick={onProposeSlot}>
                  Proposer un créneau
                </Button>
              </div>
            )}
            {side === "artist" && r.status === "accepted" && (
              <Button className="mt-3 w-full" onClick={onProposeSlot}>
                Proposer un créneau
              </Button>
            )}
            {side === "client" && (
              <Link href={`/tatoueurs/${conversation.artistSlug}`} className="mt-3 block text-sm font-semibold text-accent">
                Voir le profil de {conversation.artistName}
              </Link>
            )}
            {time}
          </div>
        </div>
      );
    }
  }
}
