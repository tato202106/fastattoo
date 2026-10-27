"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DEFAULT_HOURS, timesForDay, WEEKDAYS } from "@/lib/accounts/availability";
import { addDays, formatLongDate, todayISO } from "@/lib/dates";
import type { OpeningHours, Slot } from "@/lib/types";

/** Jours proposés dans le calendrier des créneaux (3 semaines). */
const DAYS_SHOWN = 21;

/** Horaires d'ouverture + créneaux libres, dans l'espace tatoueur. */
export function AvailabilityManager({ initialHours, initialSlots, published }: { initialHours: OpeningHours | null; initialSlots: Slot[]; published: boolean }) {
  const [hours, setHours] = useState<OpeningHours | null>(initialHours);
  return (
    <div className="space-y-8">
      <HoursEditor hours={hours} onSaved={setHours} published={published} />
      <SlotsEditor hours={hours} initial={initialSlots} published={published} />
    </div>
  );
}

/* ---------- Horaires d'ouverture ---------- */

function HoursEditor({ hours, onSaved, published }: { hours: OpeningHours | null; onSaved: (h: OpeningHours) => void; published: boolean }) {
  const [draft, setDraft] = useState<OpeningHours>(hours ?? DEFAULT_HOURS);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update(i: number, value: OpeningHours[number]) {
    setDraft((d) => d.map((x, j) => (j === i ? value : x)));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/compte/horaires", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hours: draft }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      onSaved(draft);
      setStatus("saved");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Mes horaires</h3>
        <p className="text-sm text-muted">Affichés sur ton profil. Ils servent aussi à te proposer les heures de tes créneaux.</p>
      </div>
      <ul className="divide-y divide-border rounded-2xl bg-surface shadow-card">
        {WEEKDAYS.map((day, i) => {
          const d = draft[i] ?? null;
          return (
            <li key={day} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
              <label className="flex min-h-11 w-32 items-center gap-3 font-medium">
                <input
                  type="checkbox"
                  checked={d !== null}
                  onChange={(e) => update(i, e.target.checked ? { open: "10:00", close: "19:00" } : null)}
                  className="size-5 accent-[var(--accent)]"
                />
                {day}
              </label>
              {d ? (
                <span className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    step={1800}
                    value={d.open}
                    aria-label={`${day} : ouverture`}
                    onChange={(e) => update(i, { ...d, open: e.target.value })}
                    className="h-11 rounded-xl border border-border bg-bg px-2"
                  />
                  –
                  <input
                    type="time"
                    step={1800}
                    value={d.close}
                    aria-label={`${day} : fermeture`}
                    onChange={(e) => update(i, { ...d, close: e.target.value })}
                    className="h-11 rounded-xl border border-border bg-bg px-2"
                  />
                </span>
              ) : (
                <span className="text-sm text-muted">Fermé</span>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
          {error}
        </p>
      )}
      {status === "saved" && (
        <p role="status" className="rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
          Horaires enregistrés{published ? " et affichés sur ton profil" : ""}.
        </p>
      )}
      <Button size="lg" className="w-full" disabled={status === "saving"} onClick={save}>
        {status === "saving" ? "Enregistrement…" : "Enregistrer mes horaires"}
      </Button>
    </div>
  );
}

/* ---------- Créneaux libres ---------- */

function SlotsEditor({ hours, initial, published }: { hours: OpeningHours | null; initial: Slot[]; published: boolean }) {
  const today = useMemo(() => todayISO(), []);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)), [today]);
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [day, setDay] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s.time]);
    return m;
  }, [slots]);
  const chosen = byDay.get(day) ?? [];
  const suggested = timesForDay(hours, day);
  const times = [...new Set([...suggested, ...chosen])].sort();
  const total = slots.filter((s) => s.date >= today).length;

  async function saveDay(next: string[]) {
    const previous = slots;
    const sorted = [...new Set(next)].sort();
    setSlots((all) => [...all.filter((s) => s.date !== day), ...sorted.map((time) => ({ date: day, time }))]);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/compte/creneaux", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: day, times: sorted }) });
      const data = (await res.json().catch(() => ({}))) as { slots?: Slot[]; error?: string };
      if (!res.ok || !data.slots) throw new Error(data.error ?? "Enregistrement impossible.");
      setSlots(data.slots);
    } catch (e) {
      setSlots(previous);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggle = (t: string) => saveDay(chosen.includes(t) ? chosen.filter((x) => x !== t) : [...chosen, t]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Mes créneaux libres</h3>
        <p className="text-sm text-muted">
          Touche un jour, puis les heures où tu es disponible. {published ? "Les clients les voient sur ton profil" : "Ils s'afficheront sur ton profil dès qu'il sera en ligne"} et
          peuvent en choisir un dans leur demande.
        </p>
        <p className="mt-1 text-sm font-medium">
          {total === 0 ? "Aucun créneau libre pour l'instant." : `${total} créneau${total > 1 ? "x" : ""} libre${total > 1 ? "s" : ""} à venir.`}
        </p>
      </div>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const n = byDay.get(d)?.length ?? 0;
          const selected = d === day;
          const date = new Date(`${d}T12:00:00`);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setDay(d);
                setError(null);
              }}
              className={clsx(
                "tap flex h-[72px] w-16 shrink-0 flex-col items-center justify-center rounded-2xl border text-center",
                selected ? "border-fg bg-fg text-bg" : "border-border bg-surface",
              )}
            >
              <span className={clsx("text-xs", selected ? "text-bg/80" : "text-muted")}>{date.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
              <span className="text-lg leading-tight font-bold">{date.getDate()}</span>
              <span className={clsx("text-[11px] font-semibold", n ? (selected ? "text-bg" : "text-accent") : "opacity-0")}>{n || 0} libre{n > 1 ? "s" : ""}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-surface p-4 shadow-card">
        <p className="font-semibold first-letter:uppercase">{formatLongDate(day)}</p>
        {times.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Fermé ce jour-là d&apos;après tes horaires. Tu peux quand même ajouter une heure ci-dessous.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {times.map((t) => {
              const on = chosen.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  disabled={busy}
                  onClick={() => toggle(t)}
                  className={clsx("tap h-12 rounded-xl border text-[15px] font-semibold", on ? "border-accent bg-accent text-accent-fg" : "border-border bg-bg")}
                >
                  {t.replace(":", "h")}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {suggested.length > 0 && chosen.length < suggested.length && (
            <button type="button" disabled={busy} onClick={() => saveDay([...chosen, ...suggested])} className="tap h-11 rounded-full border border-border px-4 text-sm font-medium">
              Tout le jour
            </button>
          )}
          {chosen.length > 0 && (
            <button type="button" disabled={busy} onClick={() => saveDay([])} className="tap h-11 rounded-full border border-border px-4 text-sm font-medium">
              Aucun créneau ce jour
            </button>
          )}
        </div>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^\d{2}:\d{2}$/.test(custom)) return;
            saveDay([...chosen, custom]);
            setCustom("");
          }}
        >
          <input
            type="time"
            step={900}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            aria-label="Autre heure"
            className="h-11 flex-1 rounded-xl border border-border bg-bg px-3"
          />
          <Button type="submit" variant="outline" disabled={busy || !custom}>
            Ajouter
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-accent">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
