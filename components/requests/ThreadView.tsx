"use client";

import clsx from "clsx";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { formatLongDate } from "@/lib/dates";
import { imageUrl } from "@/lib/images";
import { budgetLabel, MESSAGE_MAX, sizeLabel, slotLabel, STATUS_LABELS, type RequestMessage, type RequestStatus, type RequestThread, type Sender } from "@/lib/requests/model";
import { styleLabel, zoneLabel } from "@/lib/styles";

const time = (isoDate: string) =>
  new Date(isoDate).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "new" && "bg-accent text-accent-fg",
        status === "booked" && "bg-success/15 text-success",
        status === "declined" && "bg-surface-2 text-muted",
        (status === "replied" || status === "proposed") && "bg-accent-soft text-accent",
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** La demande de projet telle que le client l'a envoyée. */
export function RequestSummary({ thread, title }: { thread: RequestThread; title: string }) {
  const rows: [string, string][] = [
    ["Style", thread.styles.map(styleLabel).join(", ")],
    ["Emplacement", zoneLabel(thread.zone)],
    ["Taille", sizeLabel(thread.size)],
    ["Budget", budgetLabel(thread.budgetMin, thread.budgetMax)],
    ["Quand", thread.dates.length ? thread.dates.map((d) => formatLongDate(d)).join(", ") : "Flexible"],
  ];
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">
          {title} · {time(thread.createdAt)}
        </p>
        <StatusBadge status={thread.status} />
      </div>
      <p className="mt-2 text-[16px] leading-relaxed whitespace-pre-wrap">{thread.description}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {thread.inspirations.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {thread.inspirations.map((img) => (
            <a key={img.id} href={imageUrl(img, "large")} target="_blank" rel="noopener" className="relative block aspect-square overflow-hidden rounded-xl">
              <Picture image={img} usage="list" fill sizes="33vw" alt={img.alt || "Inspiration"} />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

/** Fil de messages (bulles à droite pour celui qui consulte). */
export function MessageList({
  messages,
  viewer,
  otherName,
  onAcceptSlot,
  canAccept,
}: {
  messages: RequestMessage[];
  viewer: Sender;
  otherName: string;
  onAcceptSlot?: (messageId: number) => void;
  canAccept?: boolean;
}) {
  if (messages.length === 0) return null;
  const lastSlotId = [...messages].reverse().find((m) => m.slot && m.from === "artist")?.id;
  return (
    <ol className="space-y-3" aria-label="Messages">
      {messages.map((m) => {
        const mine = m.from === viewer;
        return (
          <li key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
            <div className={clsx("max-w-[85%] rounded-2xl px-4 py-2.5", mine ? "rounded-br-md bg-fg text-bg" : "rounded-bl-md bg-surface shadow-card")}>
              {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{otherName}</p>}
              {m.slot && (
                <p className={clsx("mb-1 flex items-center gap-1.5 font-semibold", !mine && "text-accent")}>
                  <Icon name="calendar" size={16} /> Rendez-vous proposé : {slotLabel(m.slot)}
                </p>
              )}
              {m.body && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.body}</p>}
              {m.slot && !mine && onAcceptSlot && canAccept && m.id === lastSlotId && (
                <Button size="sm" className="mt-2" onClick={() => onAcceptSlot(m.id)}>
                  <Icon name="check" size={16} /> Accepter ce rendez-vous
                </Button>
              )}
              <p className={clsx("mt-1 text-right text-[11px]", mine ? "opacity-60" : "text-muted")}>{time(m.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Zone de saisie d'un message (avec, pour le tatoueur, la proposition de rendez-vous). */
export function Composer({
  onSend,
  placeholder,
  allowSlot = false,
  disabled = false,
}: {
  onSend: (msg: { text: string; slot: { date: string; time: string } | null }) => Promise<string | null>;
  placeholder: string;
  allowSlot?: boolean;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [withSlot, setWithSlot] = useState(false);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("14:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slot = withSlot && date && hour ? { date, time: hour } : null;
  const canSend = !busy && !disabled && (text.trim().length > 0 || slot != null) && (!withSlot || slot != null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setError(null);
    const err = await onSend({ text: text.trim(), slot });
    setBusy(false);
    if (err) setError(err);
    else {
      setText("");
      setWithSlot(false);
      setDate("");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-surface p-3">
      <label htmlFor="reply" className="sr-only">
        Ton message
      </label>
      <textarea
        id="reply"
        rows={3}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value.slice(0, MESSAGE_MAX))}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl bg-bg p-3 text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-fg/20"
      />
      {allowSlot && withSlot && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="font-medium">Date</span>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-bg px-3" required />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Heure</span>
            <input type="time" step={900} value={hour} onChange={(e) => setHour(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-bg px-3" required />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {allowSlot && (
          <Button type="button" variant={withSlot ? "secondary" : "outline"} size="md" onClick={() => setWithSlot((v) => !v)} disabled={disabled}>
            <Icon name="calendar" size={18} /> {withSlot ? "Sans rendez-vous" : "Proposer un RDV"}
          </Button>
        )}
        <Button type="submit" size="md" className="ml-auto" disabled={!canSend}>
          {busy ? "Envoi…" : "Envoyer"} <Icon name="send" size={16} />
        </Button>
      </div>
    </form>
  );
}
