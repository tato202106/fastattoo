import { describe, expect, it } from "vitest";
import {
  type AgendaEntry,
  type AppointmentEntry,
  dateInTimeZone,
  endTime,
  entriesForDay,
  findConflicts,
  formatDuration,
  isISODate,
  parseAgendaInput,
  reminderDate,
  reminderEmail,
  weekStart,
} from "@/lib/agenda";

const appt = (id: number, date: string, time: string, durationMin = 120): AppointmentEntry => ({
  id, kind: "appointment", date, time, durationMin, clientName: "Thomas", clientEmail: "", clientPhone: "", label: "Fine line", notes: "", depositPaid: false, reminderSentAt: null,
});

describe("agenda : dates et heures", () => {
  it("refuse les dates impossibles", () => {
    expect(isISODate("2026-11-04")).toBe(true);
    expect(isISODate("2026-02-31")).toBe(false);
    expect(isISODate("04/11/2026")).toBe(false);
  });

  it("heure de fin et durée lisible", () => {
    expect(endTime("14:00", 150)).toBe("16:30");
    expect(endTime("22:00", 120)).toBe("24:00");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30");
  });

  it("la semaine commence le lundi", () => {
    expect(weekStart("2026-11-04")).toBe("2026-11-02"); // mercredi → lundi
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // dimanche → lundi précédent
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
  });

  it("« demain » est calculé à l'heure de Paris, pas en UTC", () => {
    // 23 h 30 UTC le 3 novembre = 0 h 30 le 4 novembre à Paris.
    expect(dateInTimeZone(new Date("2026-11-03T23:30:00Z"))).toBe("2026-11-04");
    expect(reminderDate(new Date("2026-11-03T23:30:00Z"))).toBe("2026-11-05");
    expect(reminderDate(new Date("2026-11-03T16:00:00Z"))).toBe("2026-11-04");
  });
});

describe("agenda : formulaire", () => {
  it("rendez-vous valide, nettoyé", () => {
    const r = parseAgendaInput({
      kind: "appointment", date: "2026-11-05", time: "14:00", durationMin: "120", clientName: "  Thomas ", clientEmail: "Thomas@Mail.FR", depositPaid: true,
    });
    expect(r).toEqual({
      ok: true,
      value: { kind: "appointment", date: "2026-11-05", time: "14:00", durationMin: 120, clientName: "Thomas", clientEmail: "thomas@mail.fr", clientPhone: "", label: "", notes: "", depositPaid: true },
    });
  });

  it("champs obligatoires et e-mail invalide", () => {
    const r = parseAgendaInput({ kind: "appointment", date: "", time: "25:00", durationMin: 0, clientName: "", clientEmail: "pas-un-mail" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["clientEmail", "clientName", "date", "durationMin", "time"]);
  });

  it("un rendez-vous ne déborde pas après minuit", () => {
    const r = parseAgendaInput({ kind: "appointment", date: "2026-11-05", time: "23:00", durationMin: 120, clientName: "Léa" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.durationMin).toBeDefined();
  });

  it("indisponibilité : un jour par défaut, fin après le début", () => {
    expect(parseAgendaInput({ kind: "blocked", date: "2026-12-24" })).toEqual({
      ok: true,
      value: { kind: "blocked", date: "2026-12-24", endDate: "2026-12-24", label: "Indisponible" },
    });
    const r = parseAgendaInput({ kind: "blocked", date: "2026-12-24", endDate: "2026-12-20" });
    expect(r.ok).toBe(false);
  });

  it("type inconnu refusé", () => {
    expect(parseAgendaInput({ kind: "autre", date: "2026-11-05" }).ok).toBe(false);
    expect(parseAgendaInput(null).ok).toBe(false);
  });
});

describe("agenda : planning et conflits", () => {
  const entries: AgendaEntry[] = [
    appt(1, "2026-11-05", "14:00"),
    appt(2, "2026-11-05", "10:00", 60),
    { id: 3, kind: "blocked", date: "2026-11-06", endDate: "2026-11-08", label: "Convention" },
  ];

  it("indisponibilités d'abord, puis rendez-vous par heure", () => {
    expect(entriesForDay(entries, "2026-11-05").map((e) => e.id)).toEqual([2, 1]);
    expect(entriesForDay(entries, "2026-11-07").map((e) => e.id)).toEqual([3]);
    expect(entriesForDay(entries, "2026-11-09")).toEqual([]);
  });

  it("chevauchement de rendez-vous", () => {
    const base = { kind: "appointment" as const, date: "2026-11-05", clientName: "Léa", clientEmail: "", clientPhone: "", label: "", notes: "", depositPaid: false };
    expect(findConflicts(entries, { ...base, time: "15:00", durationMin: 60 }).map((c) => c.entry.id)).toEqual([1]);
    expect(findConflicts(entries, { ...base, time: "11:00", durationMin: 180 })).toEqual([]); // 11h–14h : se termine pile au début du suivant
    expect(findConflicts(entries, { ...base, time: "14:00", durationMin: 60 }, 1)).toEqual([]); // on modifie le rendez-vous 1 lui-même
  });

  it("rendez-vous sur un jour indisponible, et indisponibilité sur des rendez-vous", () => {
    const r = findConflicts(entries, { kind: "appointment", date: "2026-11-07", time: "10:00", durationMin: 60, clientName: "Léa", clientEmail: "", clientPhone: "", label: "", notes: "", depositPaid: false });
    expect(r).toEqual([{ entry: entries[2], reason: "blocked" }]);
    expect(findConflicts(entries, { kind: "blocked", date: "2026-11-04", endDate: "2026-11-05", label: "Congés" }).map((c) => c.entry.id)).toEqual([1, 2]);
  });
});

describe("agenda : rappel e-mail", () => {
  it("contient la date, l'heure, le tatoueur et l'adresse", () => {
    const { subject, text } = reminderEmail(appt(1, "2026-11-05", "14:00", 150), { name: "Léa", studio: "Studio Encre", address: "3 rue Nationale", city: "Nantes", email: "lea@mail.fr" });
    expect(subject).toBe("Rappel : ton rendez-vous tattoo demain à 14h00");
    expect(text).toContain("Bonjour Thomas");
    expect(text).toContain("jeudi 5 novembre, à 14h00, avec Léa");
    expect(text).toContain("« Fine line »");
    expect(text).toContain("2 h 30");
    expect(text).toContain("Studio Encre, 3 rue Nationale, Nantes");
  });
});
