"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/account/LoginGate";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { daySchedule, type ScheduleEntry } from "@/lib/calendar";
import { addDays, formatDayHeading, parseISODate, todayISO } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { useArtistData } from "./useArtistData";

/**
 * Calendrier simplifié (SPEC §24) : « Aujourd'hui » par défaut, puis « Cette semaine ».
 * Bloquer / débloquer un créneau = un tap.
 */
export function CalendarView() {
  const { artistId, appointments } = useArtistData();
  const blocks = useApp((s) => s.blocks);
  const toggleBlock = useApp((s) => s.toggleBlock);
  const today = todayISO();
  const [view, setView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(today);
  const [detail, setDetail] = useState<Extract<ScheduleEntry, { kind: "appointment" }> | null>(null);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);
  const schedule = (date: string) => daySchedule(artistId, date, appointments, blocks);

  const renderDay = (date: string, compact = false) => {
    const entries = schedule(date);
    return (
      <section key={date} aria-labelledby={`d-${date}`} className={compact ? "" : "pt-2"}>
        <h2 id={`d-${date}`} className="mb-2 text-sm font-bold tracking-wide text-muted">
          {formatDayHeading(date)}
          {date === today && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-fg">AUJOURD&apos;HUI</span>}
        </h2>
        {entries.length === 0 && <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">Jour de repos</p>}
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={`${date}-${e.time}-${e.kind}`}>
              {e.kind === "appointment" ? (
                <button type="button" onClick={() => setDetail(e)} className="tap flex w-full items-center gap-4 rounded-2xl bg-fg p-4 text-left text-bg">
                  <span className="w-12 text-lg font-bold tabular-nums">{e.time}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{e.appointment.clientName}</span>
                    <span className="block truncate text-sm opacity-75">
                      {e.appointment.label} · {e.appointment.durationH} h
                    </span>
                  </span>
                  <Icon name="chevronRight" size={18} className="opacity-60" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleBlock(artistId, date, e.time)}
                  aria-pressed={e.kind === "blocked"}
                  className={clsx(
                    "tap flex w-full items-center gap-4 rounded-2xl border p-4 text-left",
                    e.kind === "blocked" ? "border-border bg-surface-2 text-muted" : "border-dashed border-success/50 bg-surface",
                  )}
                >
                  <span className="w-12 text-lg font-bold tabular-nums">{e.time}</span>
                  <span className="flex-1">
                    <span className={clsx("block font-semibold", e.kind === "free" && "text-success")}>{e.kind === "free" ? "Disponible" : "Bloqué"}</span>
                    <span className="block text-xs text-muted">{e.kind === "free" ? "Touchez pour bloquer" : "Touchez pour débloquer"}</span>
                  </span>
                  <Icon name={e.kind === "free" ? "lock" : "refresh"} size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  return (
    <>
      <PageHeader title="Calendrier" />
      <div className="flex gap-2 px-4 pb-3 lg:px-0">
        <Chip selected={view === "day"} onClick={() => setView("day")}>
          Aujourd&apos;hui
        </Chip>
        <Chip selected={view === "week"} onClick={() => setView("week")}>
          Cette semaine
        </Chip>
      </div>

      {view === "day" ? (
        <div className="px-4 lg:px-0">
          <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {week.map((d) => {
              const busy = schedule(d).filter((e) => e.kind === "appointment").length;
              const date = parseISODate(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  aria-pressed={d === day}
                  className={clsx("tap flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border", d === day ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                >
                  <span className="text-[11px] uppercase opacity-70">{date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}</span>
                  <span className="text-lg font-bold">{date.getDate()}</span>
                  <span className={clsx("size-1.5 rounded-full", busy ? "bg-accent" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
          {renderDay(day)}
        </div>
      ) : (
        <div className="space-y-6 px-4 lg:px-0">{week.map((d) => renderDay(d, true))}</div>
      )}

      <Sheet open={detail != null} onClose={() => setDetail(null)} title="Rendez-vous">
        {detail && (
          <div className="space-y-3 pb-2">
            <p className="text-2xl font-bold">
              {detail.time} · {detail.appointment.clientName}
            </p>
            <p className="text-muted">
              {detail.appointment.label} · {detail.appointment.durationH} h
            </p>
            {detail.appointment.conversationId && (
              <Link href={`/messages/${detail.appointment.conversationId}`} className="tap flex h-12 items-center justify-center gap-2 rounded-2xl bg-fg font-semibold text-bg">
                <Icon name="message" size={18} /> Écrire à {detail.appointment.clientName}
              </Link>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
