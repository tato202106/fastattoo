/**
 * Agenda du tatoueur (espace tatoueur réel, données dans Neon) — logique pure, testée.
 *
 * Deux types d'entrées :
 * - rendez-vous : un jour, une heure de début libre et une durée ; client, projet,
 *   acompte, notes. Un rappel e-mail part la veille si l'e-mail du client est renseigné ;
 * - indisponibilité : un ou plusieurs jours entiers (congés, convention…).
 *
 * Les jours sont des chaînes YYYY-MM-DD et les heures des chaînes HH:MM, en heure
 * locale du studio (France / Belgique). Aucun fuseau n'est stocké : le rappel
 * calcule « demain » dans le fuseau Europe/Paris (identique à Bruxelles).
 */

import { addDays, diffDays, parseISODate, toISODate } from "./dates";

export const AGENDA_TIME_ZONE = "Europe/Paris";

export type AppointmentEntry = {
  id: number;
  kind: "appointment";
  date: string;
  time: string;
  durationMin: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  label: string;
  notes: string;
  depositPaid: boolean;
  reminderSentAt: string | null;
};

export type BlockedEntry = {
  id: number;
  kind: "blocked";
  date: string;
  endDate: string;
  label: string;
};

export type AgendaEntry = AppointmentEntry | BlockedEntry;

/** Données envoyées par le formulaire (sans id ni état du rappel). */
export type AppointmentInput = Omit<AppointmentEntry, "id" | "reminderSentAt">;
export type BlockedInput = Omit<BlockedEntry, "id">;
export type AgendaInput = AppointmentInput | BlockedInput;

export const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480] as const;
export const MIN_DURATION = 15;
export const MAX_DURATION = 12 * 60;
/** Une indisponibilité couvre au plus un an. */
export const MAX_BLOCK_DAYS = 366;
/** Période maximale chargée en une requête. */
export const MAX_RANGE_DAYS = 62;

const LIMITS = { clientName: 80, clientEmail: 120, clientPhone: 30, label: 120, notes: 1000, blockLabel: 80 } as const;

/* ---------- Dates et heures ---------- */

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value; // refuse le 31 février, etc.
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMinutes(total: number): string {
  const t = Math.max(0, Math.min(24 * 60, Math.round(total)));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Heure de fin d'un rendez-vous (« 16:30 »). */
export function endTime(time: string, durationMin: number): string {
  return fromMinutes(toMinutes(time) + durationMin);
}

/** « 1 h », « 1 h 30 », « 45 min » */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Lundi de la semaine qui contient ce jour. */
export function weekStart(iso: string): string {
  const day = parseISODate(iso).getDay(); // 0 = dimanche
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Jour (YYYY-MM-DD) d'un instant dans un fuseau donné. */
export function dateInTimeZone(now: Date, timeZone = AGENDA_TIME_ZONE): string {
  // en-CA formate en YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Jour des rendez-vous à rappeler : demain, en heure de Paris / Bruxelles. */
export function reminderDate(now: Date): string {
  return addDays(dateInTimeZone(now), 1);
}

/* ---------- Validation du formulaire ---------- */

export type AgendaErrors = Partial<Record<"kind" | "date" | "endDate" | "time" | "durationMin" | "clientName" | "clientEmail" | "clientPhone" | "label" | "notes", string>>;

export type ParseResult = { ok: true; value: AgendaInput } | { ok: false; errors: AgendaErrors };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Vérifie et nettoie une entrée envoyée par le formulaire (ou l'API). */
export function parseAgendaInput(body: unknown): ParseResult {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const errors: AgendaErrors = {};
  const date = str(b.date);
  if (!isISODate(date)) errors.date = "Choisis une date.";

  if (b.kind === "blocked") {
    const endDate = str(b.endDate) || date;
    const label = str(b.label) || "Indisponible";
    if (!isISODate(endDate)) errors.endDate = "Choisis une date de fin.";
    else if (isISODate(date) && endDate < date) errors.endDate = "La date de fin doit être après la date de début.";
    else if (isISODate(date) && diffDays(date, endDate) >= MAX_BLOCK_DAYS) errors.endDate = "Une indisponibilité ne peut pas dépasser un an.";
    if (label.length > LIMITS.blockLabel) errors.label = `${LIMITS.blockLabel} caractères maximum.`;
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true, value: { kind: "blocked", date, endDate, label } };
  }

  if (b.kind !== "appointment") return { ok: false, errors: { kind: "Type d'entrée inconnu." } };

  const time = str(b.time);
  const durationMin = typeof b.durationMin === "number" ? b.durationMin : Number(str(b.durationMin));
  const clientName = str(b.clientName);
  const clientEmail = str(b.clientEmail).toLowerCase();
  const clientPhone = str(b.clientPhone);
  const label = str(b.label);
  const notes = str(b.notes);

  if (!isTime(time)) errors.time = "Choisis une heure.";
  if (!Number.isInteger(durationMin) || durationMin < MIN_DURATION || durationMin > MAX_DURATION) errors.durationMin = "Choisis une durée.";
  else if (isTime(time) && toMinutes(time) + durationMin > 24 * 60) errors.durationMin = "Le rendez-vous doit finir avant minuit.";
  if (!clientName) errors.clientName = "Indique le nom du client.";
  else if (clientName.length > LIMITS.clientName) errors.clientName = `${LIMITS.clientName} caractères maximum.`;
  if (clientEmail && (clientEmail.length > LIMITS.clientEmail || !EMAIL.test(clientEmail))) errors.clientEmail = "Cet e-mail ne semble pas valide.";
  if (clientPhone.length > LIMITS.clientPhone) errors.clientPhone = "Numéro trop long.";
  if (label.length > LIMITS.label) errors.label = `${LIMITS.label} caractères maximum.`;
  if (notes.length > LIMITS.notes) errors.notes = `${LIMITS.notes} caractères maximum.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { kind: "appointment", date, time, durationMin, clientName, clientEmail, clientPhone, label, notes, depositPaid: b.depositPaid === true },
  };
}

/* ---------- Affichage ---------- */

/** Une indisponibilité couvre-t-elle ce jour ? */
export function covers(block: Pick<BlockedEntry, "date" | "endDate">, iso: string): boolean {
  return block.date <= iso && iso <= block.endDate;
}

/** Entrées d'un jour : indisponibilités d'abord, puis rendez-vous par heure. */
export function entriesForDay(entries: AgendaEntry[], iso: string): AgendaEntry[] {
  const blocks = entries.filter((e): e is BlockedEntry => e.kind === "blocked" && covers(e, iso));
  const appts = entries
    .filter((e): e is AppointmentEntry => e.kind === "appointment" && e.date === iso)
    .sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);
  return [...blocks, ...appts];
}

/** Nombre de rendez-vous par jour (pastilles de la barre des jours). */
export function appointmentCount(entries: AgendaEntry[], iso: string): number {
  return entries.filter((e) => e.kind === "appointment" && e.date === iso).length;
}

/* ---------- Conflits ---------- */

export type Conflict = { entry: AgendaEntry; reason: "overlap" | "blocked" };

/**
 * Entrées en conflit avec une saisie : rendez-vous qui se chevauchent, ou rendez-vous
 * posé sur un jour indisponible. Simple avertissement : le tatoueur décide.
 */
export function findConflicts(entries: AgendaEntry[], input: AgendaInput, ignoreId?: number): Conflict[] {
  const others = entries.filter((e) => e.id !== ignoreId);
  if (input.kind === "blocked") {
    return others
      .filter((e): e is AppointmentEntry => e.kind === "appointment" && covers(input, e.date))
      .map((entry) => ({ entry, reason: "blocked" as const }));
  }
  const start = toMinutes(input.time);
  const end = start + input.durationMin;
  const out: Conflict[] = [];
  for (const e of others) {
    if (e.kind === "blocked") {
      if (covers(e, input.date)) out.push({ entry: e, reason: "blocked" });
    } else if (e.date === input.date) {
      const s = toMinutes(e.time);
      if (s < end && start < s + e.durationMin) out.push({ entry: e, reason: "overlap" });
    }
  }
  return out;
}

/* ---------- Rappel e-mail ---------- */

export type ReminderArtist = { name: string; studio: string; address: string; city: string; email: string };

/** Texte du rappel envoyé au client la veille du rendez-vous. */
export function reminderEmail(appt: Pick<AppointmentEntry, "date" | "time" | "durationMin" | "clientName" | "label">, artist: ReminderArtist): { subject: string; text: string } {
  const who = artist.name || "Ton tatoueur";
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(parseISODate(appt.date));
  const hour = appt.time.replace(":", "h");
  const place = [artist.studio, artist.address, artist.city].filter(Boolean).join(", ");
  const lines = [
    `Bonjour ${appt.clientName},`,
    "",
    `Petit rappel : tu as rendez-vous demain, ${day}, à ${hour}, avec ${who}${appt.label ? ` pour ton projet « ${appt.label} »` : ""}.`,
    `Durée prévue : ${formatDuration(appt.durationMin)}.`,
  ];
  if (place) lines.push(`Adresse : ${place}.`);
  lines.push(
    "",
    "Un empêchement ? Réponds simplement à cet e-mail pour prévenir ton tatoueur.",
    "",
    "À demain !",
    "",
    "—",
    "Envoyé par Fastattoo pour le compte de ton tatoueur.",
  );
  return { subject: `Rappel : ton rendez-vous tattoo demain à ${hour}`, text: lines.join("\n") };
}
