import { describe, expect, it } from "vitest";
import {
  DEFAULT_HOURS,
  DEFAULT_TIMES,
  groupOpeningHours,
  parseDaySlots,
  parseOpeningHours,
  readOpeningHours,
  timesForDay,
  upcomingSlots,
  weekdayIndex,
} from "@/lib/accounts/availability";

const TODAY = "2026-10-27"; // mardi

describe("horaires d'ouverture", () => {
  it("valide 7 jours, ouverture avant fermeture", () => {
    expect(parseOpeningHours(DEFAULT_HOURS).ok).toBe(true);
    expect(parseOpeningHours([null, null]).ok).toBe(false);
    const bad = [...DEFAULT_HOURS];
    bad[1] = { open: "19:00", close: "10:00" };
    const r = parseOpeningHours(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Mardi/);
    const badTime = [...DEFAULT_HOURS];
    badTime[2] = { open: "25:00", close: "26:00" };
    expect(parseOpeningHours(badTime).ok).toBe(false);
    expect(readOpeningHours("n'importe quoi")).toBeNull();
  });

  it("jour de la semaine (lundi = 0)", () => {
    expect(weekdayIndex("2026-10-26")).toBe(0);
    expect(weekdayIndex(TODAY)).toBe(1);
    expect(weekdayIndex("2026-11-01")).toBe(6);
  });

  it("heures proposées selon les horaires", () => {
    expect(timesForDay(DEFAULT_HOURS, TODAY)).toEqual(["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]);
    expect(timesForDay(DEFAULT_HOURS, "2026-11-01")).toEqual([]);
    expect(timesForDay(null, TODAY)).toEqual(DEFAULT_TIMES);
    const half = [...DEFAULT_HOURS];
    half[1] = { open: "09:30", close: "12:00" };
    expect(timesForDay(half, TODAY)).toEqual(["10:00", "11:00"]);
  });

  it("affichage regroupé", () => {
    expect(groupOpeningHours(DEFAULT_HOURS)).toEqual([
      { days: "Lundi", hours: null },
      { days: "Mardi – Samedi", hours: "10 h – 19 h" },
      { days: "Dimanche", hours: null },
    ]);
    const h = [...DEFAULT_HOURS];
    h[5] = { open: "10:30", close: "16:00" };
    expect(groupOpeningHours(h)[2]).toEqual({ days: "Samedi", hours: "10 h 30 – 16 h" });
  });
});

describe("créneaux libres", () => {
  it("valide un jour de créneaux", () => {
    const r = parseDaySlots({ date: "2026-10-30", times: ["14:00", "10:00", "14:00"] }, TODAY);
    expect(r).toEqual({ ok: true, date: "2026-10-30", times: ["10:00", "14:00"] });
    expect(parseDaySlots({ date: "2026-10-30", times: [] }, TODAY).ok).toBe(true);
  });

  it("refuse le passé, trop loin, heures invalides", () => {
    expect(parseDaySlots({ date: "2026-10-26", times: ["10:00"] }, TODAY).ok).toBe(false);
    expect(parseDaySlots({ date: "2027-03-01", times: ["10:00"] }, TODAY).ok).toBe(false);
    expect(parseDaySlots({ date: "2026-10-30", times: ["10h"] }, TODAY).ok).toBe(false);
    expect(parseDaySlots({ date: "30/10/2026", times: [] }, TODAY).ok).toBe(false);
    expect(parseDaySlots(null, TODAY).ok).toBe(false);
  });

  it("ne garde que les créneaux à venir, triés", () => {
    expect(
      upcomingSlots(
        [
          { date: "2026-10-28", time: "14:00" },
          { date: "2026-10-20", time: "10:00" },
          { date: "2026-10-28", time: "10:00" },
          { date: TODAY, time: "17:00" },
        ],
        TODAY,
      ),
    ).toEqual([
      { date: TODAY, time: "17:00" },
      { date: "2026-10-28", time: "10:00" },
      { date: "2026-10-28", time: "14:00" },
    ]);
  });
});
