import "server-only";
import { neon } from "@neondatabase/serverless";
import type { AgendaEntry, AgendaInput, AppointmentEntry, ReminderArtist } from "../agenda";
import { ensureAccountTables } from "./db";

/**
 * Agenda des tatoueurs dans Neon. Table créée automatiquement au premier usage :
 * - agenda_entries : rendez-vous (kind = 'appointment') et indisponibilités
 *   (kind = 'blocked', du jour `day` au jour `end_day` inclus).
 * Jours et heures en texte (YYYY-MM-DD, HH:MM), heure locale du studio.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const connect = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");
  return neon(url);
};

let ready: Promise<void> | null = null;

export function ensureAgendaTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureAccountTables();
      const sql = connect();
      await sql`CREATE TABLE IF NOT EXISTS agenda_entries (
        id serial PRIMARY KEY,
        account_id integer NOT NULL REFERENCES artist_accounts(id) ON DELETE CASCADE,
        kind text NOT NULL,
        day text NOT NULL,
        end_day text,
        start_time text,
        duration_min integer,
        client_name text NOT NULL DEFAULT '',
        client_email text NOT NULL DEFAULT '',
        client_phone text NOT NULL DEFAULT '',
        label text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        deposit_paid boolean NOT NULL DEFAULT false,
        reminder_sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS agenda_entries_account_day ON agenda_entries (account_id, day)`;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null);

function toEntry(r: Row): AgendaEntry {
  if (r.kind === "blocked") return { id: r.id, kind: "blocked", date: r.day, endDate: r.end_day ?? r.day, label: r.label ?? "" };
  return {
    id: r.id,
    kind: "appointment",
    date: r.day,
    time: r.start_time ?? "00:00",
    durationMin: r.duration_min ?? 60,
    clientName: r.client_name ?? "",
    clientEmail: r.client_email ?? "",
    clientPhone: r.client_phone ?? "",
    label: r.label ?? "",
    notes: r.notes ?? "",
    depositPaid: Boolean(r.deposit_paid),
    reminderSentAt: iso(r.reminder_sent_at),
  };
}

/** Colonnes à écrire pour une saisie (les champs d'un autre type sont remis à vide). */
function columns(input: AgendaInput) {
  if (input.kind === "blocked") {
    return { kind: "blocked", day: input.date, endDay: input.endDate, time: null, duration: null, name: "", email: "", phone: "", label: input.label, notes: "", deposit: false };
  }
  return {
    kind: "appointment",
    day: input.date,
    endDay: null,
    time: input.time,
    duration: input.durationMin,
    name: input.clientName,
    email: input.clientEmail,
    phone: input.clientPhone,
    label: input.label,
    notes: input.notes,
    deposit: input.depositPaid,
  };
}

/** Entrées qui touchent la période [from, to] (indisponibilités commencées avant comprises). */
export async function listAgenda(accountId: number, from: string, to: string): Promise<AgendaEntry[]> {
  await ensureAgendaTable();
  const rows = (await connect()`SELECT * FROM agenda_entries
    WHERE account_id = ${accountId} AND day <= ${to} AND COALESCE(end_day, day) >= ${from}
    ORDER BY day, start_time NULLS FIRST, id`) as Row[];
  return rows.map(toEntry);
}

export async function createAgendaEntry(accountId: number, input: AgendaInput): Promise<AgendaEntry> {
  await ensureAgendaTable();
  const c = columns(input);
  const rows = (await connect()`INSERT INTO agenda_entries
      (account_id, kind, day, end_day, start_time, duration_min, client_name, client_email, client_phone, label, notes, deposit_paid)
    VALUES (${accountId}, ${c.kind}, ${c.day}, ${c.endDay}, ${c.time}, ${c.duration}, ${c.name}, ${c.email}, ${c.phone}, ${c.label}, ${c.notes}, ${c.deposit})
    RETURNING *`) as Row[];
  return toEntry(rows[0]!);
}

/**
 * Modifie une entrée du tatoueur. Si le jour, l'heure ou l'e-mail du client change,
 * le rappel pourra repartir pour le nouveau rendez-vous.
 */
export async function updateAgendaEntry(accountId: number, id: number, input: AgendaInput): Promise<AgendaEntry | null> {
  await ensureAgendaTable();
  const c = columns(input);
  const rows = (await connect()`UPDATE agenda_entries SET
      kind = ${c.kind}, day = ${c.day}, end_day = ${c.endDay}, start_time = ${c.time}, duration_min = ${c.duration},
      client_name = ${c.name}, client_email = ${c.email}, client_phone = ${c.phone}, label = ${c.label}, notes = ${c.notes},
      deposit_paid = ${c.deposit}, updated_at = now(),
      reminder_sent_at = CASE
        WHEN day IS DISTINCT FROM ${c.day} OR start_time IS DISTINCT FROM ${c.time} OR client_email IS DISTINCT FROM ${c.email} THEN NULL
        ELSE reminder_sent_at END
    WHERE id = ${id} AND account_id = ${accountId}
    RETURNING *`) as Row[];
  return rows[0] ? toEntry(rows[0]) : null;
}

export async function deleteAgendaEntry(accountId: number, id: number): Promise<boolean> {
  await ensureAgendaTable();
  const rows = (await connect()`DELETE FROM agenda_entries WHERE id = ${id} AND account_id = ${accountId} RETURNING id`) as Row[];
  return rows.length > 0;
}

/* ---------- Rappels de la veille ---------- */

export type DueReminder = { appointment: AppointmentEntry; artist: ReminderArtist; subscriptionStatus: string | null };

/** Rendez-vous de ce jour avec un e-mail client et sans rappel déjà envoyé. */
export async function dueReminders(day: string): Promise<DueReminder[]> {
  await ensureAgendaTable();
  const rows = (await connect()`SELECT e.*, a.name AS artist_name, a.studio AS artist_studio, a.address AS artist_address,
      a.city AS artist_city, a.email AS artist_email, a.subscription_status AS artist_subscription
    FROM agenda_entries e JOIN artist_accounts a ON a.id = e.account_id
    WHERE e.kind = 'appointment' AND e.day = ${day} AND e.client_email <> '' AND e.reminder_sent_at IS NULL
    ORDER BY e.start_time, e.id`) as Row[];
  return rows.map((r) => ({
    appointment: toEntry(r) as AppointmentEntry,
    artist: { name: r.artist_name ?? "", studio: r.artist_studio ?? "", address: r.artist_address ?? "", city: r.artist_city ?? "", email: r.artist_email ?? "" },
    subscriptionStatus: r.artist_subscription ?? null,
  }));
}

/** Réserve l'envoi d'un rappel (une seule fois, même si deux envois tournent en même temps). */
export async function claimReminder(id: number): Promise<boolean> {
  const rows = (await connect()`UPDATE agenda_entries SET reminder_sent_at = now()
    WHERE id = ${id} AND reminder_sent_at IS NULL RETURNING id`) as Row[];
  return rows.length > 0;
}

/** Libère la réservation si l'e-mail n'est pas parti. */
export async function releaseReminder(id: number): Promise<void> {
  await connect()`UPDATE agenda_entries SET reminder_sent_at = NULL WHERE id = ${id}`;
}
