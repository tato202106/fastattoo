"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import {
  type AgendaEntry,
  type AgendaErrors,
  appointmentCount,
  DURATION_OPTIONS,
  endTime,
  entriesForDay,
  findConflicts,
  formatDuration,
  parseAgendaInput,
  weekDays,
  weekStart,
} from "@/lib/agenda";
import { addDays, formatDayHeading, formatShortDay, parseISODate } from "@/lib/dates";

const INPUT = "mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg";

type Draft = {
  kind: "appointment" | "blocked";
  date: string;
  endDate: string;
  time: string;
  durationMin: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  label: string;
  notes: string;
  depositPaid: boolean;
};

const emptyDraft = (date: string): Draft => ({
  kind: "appointment",
  date,
  endDate: date,
  time: "14:00",
  durationMin: 120,
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  label: "",
  notes: "",
  depositPaid: false,
});

function draftFrom(e: AgendaEntry): Draft {
  if (e.kind === "blocked") return { ...emptyDraft(e.date), kind: "blocked", endDate: e.endDate, label: e.label };
  return {
    kind: "appointment",
    date: e.date,
    endDate: e.date,
    time: e.time,
    durationMin: e.durationMin,
    clientName: e.clientName,
    clientEmail: e.clientEmail,
    clientPhone: e.clientPhone,
    label: e.label,
    notes: e.notes,
    depositPaid: e.depositPaid,
  };
}

/**
 * Agenda du tatoueur (espace tatoueur réel) : vue jour ou semaine, rendez-vous à
 * l'heure de son choix, indisponibilités sur des jours entiers, rappel e-mail au
 * client la veille.
 */
export function Agenda({ today }: { today: string }) {
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(today);
  const start = weekStart(day);
  const days = useMemo(() => weekDays(start), [start]);
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Formulaire : null = fermé ; editing = id de l'entrée modifiée.
  const [form, setForm] = useState<{ draft: Draft; editing: number | null } | null>(null);

  // Aucun setState avant le premier await : la fonction est appelée depuis un effet.
  const load = useCallback(async (from: string) => {
    try {
      const res = await fetch(`/api/compte/agenda?from=${from}&to=${addDays(from, 6)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { entries: AgendaEntry[] };
      setEntries(data.entries);
      setLoaded(from);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load(start);
  }, [start, load]);

  const goWeek = (delta: number) => setDay(addDays(day, delta * 7));

  const onSaved = (entry: AgendaEntry, editing: number | null) => {
    setForm(null);
    setEntries((list) => [...list.filter((e) => e.id !== editing && e.id !== entry.id), entry]);
    // Rendez-vous déplacé vers une autre semaine : on y va.
    if (weekStart(entry.date) !== start) setDay(entry.date);
  };
  const onDeleted = (id: number) => {
    setForm(null);
    setEntries((list) => list.filter((e) => e.id !== id));
  };

  const renderDay = (date: string, compact = false) => {
    const list = entriesForDay(entries, date);
    return (
      <section key={date} aria-labelledby={`jour-${date}`} className={compact ? "" : "pt-1"}>
        <h2 id={`jour-${date}`} className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-muted">
          {formatDayHeading(date)}
          {date === today && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-fg">AUJOURD&apos;HUI</span>}
        </h2>
        {list.length === 0 ? (
          <button
            type="button"
            onClick={() => setForm({ draft: emptyDraft(date), editing: null })}
            className="tap flex w-full items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-left text-sm text-muted"
          >
            <Icon name="plus" size={18} /> Rien de prévu · ajouter un rendez-vous
          </button>
        ) : (
          <ul className="space-y-2">
            {list.map((e) => (
              <li key={e.id}>
                <EntryCard entry={e} onOpen={() => setForm({ draft: draftFrom(e), editing: e.id })} />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-4 pb-10">
      <header className="pt-4">
        <Link href="/espace-tatoueur" className="tap -ml-1 inline-flex h-11 items-center gap-1 text-sm text-muted">
          <Icon name="back" size={18} /> Espace tatoueur
        </Link>
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-[30px] leading-tight font-bold">Mon agenda</h1>
          <Button size="md" onClick={() => setForm({ draft: emptyDraft(day < today ? today : day), editing: null })}>
            <Icon name="plus" size={18} /> Ajouter
          </Button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => goWeek(-1)} aria-label="Semaine précédente" className="tap inline-flex size-11 items-center justify-center rounded-full border border-border">
          <Icon name="back" size={18} />
        </button>
        <p className="flex-1 text-center text-sm font-semibold capitalize">
          {formatShortDay(start)} – {formatShortDay(addDays(start, 6))}
        </p>
        <button type="button" onClick={() => goWeek(1)} aria-label="Semaine suivante" className="tap inline-flex size-11 items-center justify-center rounded-full border border-border">
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <div className="flex gap-2">
        <Chip selected={view === "day"} onClick={() => setView("day")}>
          Jour
        </Chip>
        <Chip selected={view === "week"} onClick={() => setView("week")}>
          Semaine
        </Chip>
        {weekStart(today) !== start || day !== today ? (
          <Chip onClick={() => setDay(today)} className="ml-auto">
            Aujourd&apos;hui
          </Chip>
        ) : null}
      </div>

      {loadError && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
          Impossible de charger ton agenda.{" "}
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              void load(start);
            }}
            className="font-semibold underline"
          >
            Réessayer
          </button>
        </p>
      )}

      {loaded !== start && !loadError ? (
        <div className="skeleton h-40 rounded-2xl" aria-label="Chargement" />
      ) : view === "day" ? (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const busy = appointmentCount(entries, d);
              const blocked = entries.some((e) => e.kind === "blocked" && e.date <= d && d <= e.endDate);
              const date = parseISODate(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  aria-pressed={d === day}
                  aria-label={`${formatShortDay(d)}${busy ? `, ${busy} rendez-vous` : ""}${blocked ? ", indisponible" : ""}`}
                  className={clsx(
                    "tap flex h-16 flex-col items-center justify-center rounded-2xl border",
                    d === day ? "border-fg bg-fg text-bg" : blocked ? "border-border bg-surface-2 text-muted" : "border-border bg-surface",
                  )}
                >
                  <span className="text-[11px] uppercase opacity-70">{date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
                  <span className="text-lg font-bold">{date.getDate()}</span>
                  <span className={clsx("size-1.5 rounded-full", busy ? "bg-accent" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
          {renderDay(day)}
        </>
      ) : (
        <div className="space-y-6">{days.map((d) => renderDay(d, true))}</div>
      )}

      {form && (
        <EntryForm
          key={form.editing ?? `new-${form.draft.date}`}
          initial={form.draft}
          editing={form.editing}
          entries={entries}
          onClose={() => setForm(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  );
}

function EntryCard({ entry, onOpen }: { entry: AgendaEntry; onOpen: () => void }) {
  if (entry.kind === "blocked") {
    const multi = entry.endDate !== entry.date;
    return (
      <button type="button" onClick={onOpen} className="tap flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-2 p-4 text-left text-muted">
        <Icon name="lock" size={20} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-fg">Indisponible{entry.label && entry.label !== "Indisponible" ? ` · ${entry.label}` : ""}</span>
          <span className="block text-xs">{multi ? `Du ${formatShortDay(entry.date)} au ${formatShortDay(entry.endDate)}` : "Toute la journée"}</span>
        </span>
        <Icon name="edit" size={18} />
      </button>
    );
  }
  return (
    <button type="button" onClick={onOpen} className="tap flex w-full items-center gap-4 rounded-2xl bg-fg p-4 text-left text-bg">
      <span className="w-14 shrink-0 tabular-nums">
        <span className="block text-lg leading-tight font-bold">{entry.time}</span>
        <span className="block text-xs opacity-70">{endTime(entry.time, entry.durationMin)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{entry.clientName}</span>
        <span className="block truncate text-sm opacity-75">
          {[entry.label, formatDuration(entry.durationMin)].filter(Boolean).join(" · ")}
        </span>
        {(entry.depositPaid || entry.reminderSentAt) && (
          <span className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {entry.depositPaid && <span className="rounded-full bg-success/20 px-2 py-0.5 text-success">Acompte versé</span>}
            {entry.reminderSentAt && <span className="rounded-full bg-bg/15 px-2 py-0.5">Rappel envoyé</span>}
          </span>
        )}
      </span>
      <Icon name="chevronRight" size={18} className="opacity-60" />
    </button>
  );
}

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

function EntryForm({
  initial,
  editing,
  entries,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: Draft;
  editing: number | null;
  entries: AgendaEntry[];
  onClose: () => void;
  onSaved: (entry: AgendaEntry, editing: number | null) => void;
  onDeleted: (id: number) => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<AgendaErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  // Conflits calculés sur la semaine affichée (simple avertissement, l'enregistrement reste possible).
  const parsed = parseAgendaInput(d);
  const conflicts = parsed.ok ? findConflicts(entries, parsed.value, editing ?? undefined) : [];
  const durations: number[] = DURATION_OPTIONS.includes(d.durationMin as (typeof DURATION_OPTIONS)[number]) ? [...DURATION_OPTIONS] : [...DURATION_OPTIONS, d.durationMin].sort((a, b) => a - b);

  async function save() {
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setFailure(null);
    setStatus("saving");
    try {
      const res = await fetch(editing ? `/api/compte/agenda?id=${editing}` : "/api/compte/agenda", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const data = (await res.json().catch(() => ({}))) as { entry?: AgendaEntry; errors?: AgendaErrors; error?: string };
      if (res.ok && data.entry) return onSaved(data.entry, editing);
      if (data.errors) setErrors(data.errors);
      setFailure(data.error ?? (data.errors ? null : "Enregistrement impossible. Réessaie dans un instant."));
    } catch {
      setFailure("Pas de connexion. Réessaie dans un instant.");
    }
    setStatus("idle");
  }

  async function remove() {
    if (!editing || !window.confirm(d.kind === "blocked" ? "Supprimer cette indisponibilité ?" : "Supprimer ce rendez-vous ?")) return;
    setStatus("deleting");
    setFailure(null);
    try {
      const res = await fetch(`/api/compte/agenda?id=${editing}`, { method: "DELETE" });
      if (res.ok) return onDeleted(editing);
      setFailure("Suppression impossible. Réessaie dans un instant.");
    } catch {
      setFailure("Pas de connexion. Réessaie dans un instant.");
    }
    setStatus("idle");
  }

  const title = editing ? (d.kind === "blocked" ? "Indisponibilité" : "Rendez-vous") : "Ajouter";

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      fullHeight
      footer={
        <div className="flex gap-2">
          {editing && (
            <Button variant="outline" size="lg" onClick={remove} disabled={status !== "idle"} aria-label="Supprimer">
              <Icon name="trash" size={18} />
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={save} disabled={status !== "idle"}>
            {status === "saving" ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4 pt-1"
      >
        {!editing && (
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Type">
            <Chip selected={d.kind === "appointment"} onClick={() => set("kind", "appointment")} className="justify-center">
              Rendez-vous
            </Chip>
            <Chip selected={d.kind === "blocked"} onClick={() => set("kind", "blocked")} className="justify-center">
              Indisponible
            </Chip>
          </div>
        )}

        {d.kind === "appointment" ? (
          <>
            <Field label="Client" error={errors.clientName}>
              <input value={d.clientName} onChange={(e) => set("clientName", e.target.value)} autoComplete="off" maxLength={80} className={INPUT} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" error={errors.date}>
                <input type="date" value={d.date} onChange={(e) => set("date", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Heure" error={errors.time}>
                <input type="time" step={900} value={d.time} onChange={(e) => set("time", e.target.value)} className={INPUT} />
              </Field>
            </div>
            <Field label="Durée" error={errors.durationMin}>
              <select value={d.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} className={INPUT}>
                {durations.map((m) => (
                  <option key={m} value={m}>
                    {formatDuration(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Projet" error={errors.label} optional>
              <input value={d.label} onChange={(e) => set("label", e.target.value)} placeholder="Fine line avant-bras, retouche…" maxLength={120} className={INPUT} />
            </Field>
            <Field label="Téléphone" error={errors.clientPhone} optional>
              <input type="tel" value={d.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} autoComplete="off" maxLength={30} className={INPUT} />
            </Field>
            <Field label="E-mail" error={errors.clientEmail} hint="Ton client reçoit un rappel par e-mail la veille du rendez-vous." optional>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                value={d.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                autoComplete="off"
                maxLength={120}
                className={INPUT}
              />
            </Field>
            <label className="tap flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface px-3">
              <input type="checkbox" checked={d.depositPaid} onChange={(e) => set("depositPaid", e.target.checked)} className="size-5 accent-current" />
              <span className="text-[15px]">Acompte versé</span>
            </label>
            <Field label="Notes" error={errors.notes} optional>
              <textarea
                rows={3}
                value={d.notes}
                onChange={(e) => set("notes", e.target.value)}
                maxLength={1000}
                placeholder="Taille, emplacement, références…"
                className="mt-1 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-fg"
              />
            </Field>
            {editing && (d.clientPhone || d.clientEmail) && (
              <div className="flex gap-2">
                {d.clientPhone && (
                  <a href={`tel:${d.clientPhone.replace(/\s/g, "")}`} className="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold">
                    Appeler
                  </a>
                )}
                {d.clientEmail && (
                  <a href={`mailto:${d.clientEmail}`} className="tap flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold">
                    <Icon name="send" size={16} /> Écrire
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Du" error={errors.date}>
                <input
                  type="date"
                  value={d.date}
                  onChange={(e) => setD((prev) => ({ ...prev, date: e.target.value, endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate }))}
                  className={INPUT}
                />
              </Field>
              <Field label="Au" error={errors.endDate}>
                <input type="date" value={d.endDate} min={d.date} onChange={(e) => set("endDate", e.target.value)} className={INPUT} />
              </Field>
            </div>
            <Field label="Motif" error={errors.label} optional>
              <input value={d.label === "Indisponible" ? "" : d.label} onChange={(e) => set("label", e.target.value)} placeholder="Congés, convention, formation…" maxLength={80} className={INPUT} />
            </Field>
          </>
        )}

        {conflicts.length > 0 && (
          <div role="status" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
            <p className="font-semibold">Attention, ce créneau est déjà pris :</p>
            <ul className="mt-1 list-disc pl-5">
              {conflicts.slice(0, 4).map(({ entry }) => (
                <li key={entry.id}>
                  {entry.kind === "blocked"
                    ? `Indisponible${entry.label && entry.label !== "Indisponible" ? ` (${entry.label})` : ""}`
                    : `${formatShortDay(entry.date)} ${entry.time}–${endTime(entry.time, entry.durationMin)} · ${entry.clientName}`}
                </li>
              ))}
            </ul>
            <p className="mt-1">Tu peux quand même enregistrer.</p>
          </div>
        )}

        {failure && (
          <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
            {failure}
          </p>
        )}
      </form>
    </Sheet>
  );
}
