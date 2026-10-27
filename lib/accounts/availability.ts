import { addDays, parseISODate } from "../dates";
import type { DayHours, OpeningHours, Slot } from "../types";

/**
 * Horaires d'ouverture et créneaux libres d'un tatoueur inscrit (logique pure, testée).
 * Les créneaux sont saisis jour par jour dans l'espace tatoueur ; les horaires
 * servent à proposer les heures possibles et sont affichés sur le profil public.
 */

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

/** Horaires proposés par défaut : du mardi au samedi, 10 h – 19 h. */
export const DEFAULT_HOURS: OpeningHours = [null, ...Array.from({ length: 5 }, () => ({ open: "10:00", close: "19:00" })), null];

/** Heures proposées quand le tatoueur n'a pas encore renseigné ses horaires. */
export const DEFAULT_TIMES = ["10:00", "14:00", "17:00"];

/** Créneaux saisissables : aujourd'hui → dans 3 mois. */
export const SLOT_HORIZON_DAYS = 90;
export const MAX_TIMES_PER_DAY = 16;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isTime(v: unknown): v is string {
  return typeof v === "string" && TIME_RE.test(v);
}

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Valide les horaires envoyés par le formulaire (7 jours, ouverture avant fermeture). */
export function parseOpeningHours(input: unknown): { ok: true; value: OpeningHours } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length !== 7) return { ok: false, error: "Horaires invalides." };
  const value: OpeningHours = [];
  for (let i = 0; i < 7; i++) {
    const d = input[i] as { open?: unknown; close?: unknown } | null;
    if (d === null || d === undefined) {
      value.push(null);
      continue;
    }
    if (!isTime(d.open) || !isTime(d.close)) return { ok: false, error: `${WEEKDAYS[i]} : heures invalides.` };
    if (minutes(d.open) >= minutes(d.close)) return { ok: false, error: `${WEEKDAYS[i]} : l'heure de fermeture doit être après l'ouverture.` };
    value.push({ open: d.open, close: d.close });
  }
  return { ok: true, value };
}

/** Horaires lus en base (JSON) : null s'ils ne sont pas exploitables. */
export function readOpeningHours(raw: unknown): OpeningHours | null {
  const r = parseOpeningHours(raw);
  return r.ok ? r.value : null;
}

/** Jour de la semaine d'une date AAAA-MM-JJ, lundi = 0. */
export function weekdayIndex(isoDate: string): number {
  return (parseISODate(isoDate).getDay() + 6) % 7;
}

/**
 * Heures proposées pour un jour : toutes les heures pleines de l'ouverture
 * jusqu'à une heure avant la fermeture. Jour fermé → aucune ; horaires non
 * renseignés → 10:00, 14:00, 17:00.
 */
export function timesForDay(hours: OpeningHours | null | undefined, isoDate: string): string[] {
  if (!hours) return DEFAULT_TIMES;
  const day: DayHours = hours[weekdayIndex(isoDate)] ?? null;
  if (!day) return [];
  const out: string[] = [];
  const start = Math.ceil(minutes(day.open) / 60) * 60;
  for (let m = start; m + 60 <= minutes(day.close); m += 60) out.push(hhmm(m));
  return out;
}

/** Valide les créneaux d'un jour envoyés par l'espace tatoueur. */
export function parseDaySlots(
  input: { date?: unknown; times?: unknown } | null | undefined,
  today: string,
): { ok: true; date: string; times: string[] } | { ok: false; error: string } {
  const date = input?.date;
  if (typeof date !== "string" || !DATE_RE.test(date) || Number.isNaN(parseISODate(date).getTime())) return { ok: false, error: "Date invalide." };
  if (date < today) return { ok: false, error: "Cette date est déjà passée." };
  if (date > addDays(today, SLOT_HORIZON_DAYS)) return { ok: false, error: "Tu peux ouvrir des créneaux jusqu'à 3 mois à l'avance." };
  if (!Array.isArray(input?.times) || !input.times.every(isTime)) return { ok: false, error: "Heures invalides." };
  const times = [...new Set(input.times as string[])].sort();
  if (times.length > MAX_TIMES_PER_DAY) return { ok: false, error: `${MAX_TIMES_PER_DAY} créneaux maximum par jour.` };
  return { ok: true, date, times };
}

/** Créneaux à venir uniquement, triés. */
export function upcomingSlots(slots: Slot[], today: string): Slot[] {
  return slots.filter((s) => s.date >= today).sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

/** Horaires regroupés pour l'affichage : « Mardi – Samedi » quand les journées se suivent à l'identique. */
export function groupOpeningHours(hours: OpeningHours): { days: string; hours: string | null }[] {
  const groups: { from: number; to: number; key: string }[] = [];
  hours.forEach((d, i) => {
    const key = d ? `${d.open}-${d.close}` : "closed";
    const last = groups[groups.length - 1];
    if (last && last.key === key && last.to === i - 1) last.to = i;
    else groups.push({ from: i, to: i, key });
  });
  return groups.map((g) => ({
    days: g.from === g.to ? WEEKDAYS[g.from]! : `${WEEKDAYS[g.from]} – ${WEEKDAYS[g.to]}`,
    hours: g.key === "closed" ? null : g.key.replace("-", " – ").replace(/:00/g, " h").replace(/:(\d\d)/g, " h $1"),
  }));
}
