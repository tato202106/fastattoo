import { addDays, parseISODate, todayISO } from "./dates";
import { DAY_SLOTS, type Appointment, type CalendarBlock } from "./store/model";

export type ScheduleEntry =
  | { kind: "free"; time: string }
  | { kind: "blocked"; time: string }
  | { kind: "appointment"; time: string; appointment: Appointment };

/** Jours non travaillés du calendrier simplifié (dimanche). */
export function isWorkingDay(date: string): boolean {
  return parseISODate(date).getDay() !== 0;
}

/**
 * Planning d'une journée (SPEC §24) : créneaux standards + rendez-vous,
 * triés par heure. Un créneau standard couvert par un rendez-vous disparaît.
 */
export function daySchedule(artistId: string, date: string, appointments: Appointment[], blocks: CalendarBlock[]): ScheduleEntry[] {
  const appts = appointments.filter((a) => a.artistId === artistId && a.date === date && a.status === "confirmed");
  const entries: ScheduleEntry[] = appts.map((a) => ({ kind: "appointment", time: a.time, appointment: a }));
  if (isWorkingDay(date)) {
    for (const time of DAY_SLOTS) {
      if (appts.some((a) => overlaps(a.time, a.durationH, time))) continue;
      const blocked = blocks.some((b) => b.artistId === artistId && b.date === date && b.time === time);
      entries.push({ kind: blocked ? "blocked" : "free", time });
    }
  }
  return entries.sort((a, b) => a.time.localeCompare(b.time));
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Le créneau standard `slot` (1 h) chevauche-t-il le rendez-vous ? */
export function overlaps(start: string, durationH: number, slot: string): boolean {
  const s = toMinutes(start);
  const e = s + durationH * 60;
  const t = toMinutes(slot);
  return t < e && t + 60 > s;
}

/** Prochains créneaux libres (pour « Proposer un créneau »). */
export function freeSlots(artistId: string, appointments: Appointment[], blocks: CalendarBlock[], from = todayISO(), days = 21, now = new Date()) {
  const out: { date: string; time: string }[] = [];
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  for (let d = 0; d < days; d++) {
    const date = addDays(from, d);
    for (const e of daySchedule(artistId, date, appointments, blocks)) {
      if (e.kind !== "free") continue;
      if (date === todayISO(now) && e.time <= nowHHMM) continue;
      out.push({ date, time: e.time });
    }
  }
  return out;
}
