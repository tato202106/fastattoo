import { describe, expect, it } from "vitest";
import { daySchedule, freeSlots, overlaps } from "@/lib/calendar";
import type { Appointment } from "@/lib/store/model";

const appt = (date: string, time: string, durationH = 2): Appointment => ({
  id: `${date}-${time}`, artistId: "a1", artistName: "Léa", artistSlug: "lea", clientId: "c", clientName: "Thomas",
  date, time, durationH, label: "Fine Line", status: "confirmed",
});

describe("calendrier", () => {
  it("chevauchement d'un rendez-vous et d'un créneau", () => {
    expect(overlaps("14:00", 2, "14:00")).toBe(true);
    expect(overlaps("13:30", 1, "14:00")).toBe(true);
    expect(overlaps("10:00", 3, "14:00")).toBe(false);
    expect(overlaps("15:30", 1, "17:00")).toBe(false);
  });

  it("planning d'un jeudi : créneaux libres, rendez-vous et blocages", () => {
    const day = "2026-10-15"; // jeudi
    const s = daySchedule("a1", day, [appt(day, "14:00")], [{ artistId: "a1", date: day, time: "17:00" }]);
    expect(s.map((e) => `${e.time}:${e.kind}`)).toEqual(["10:00:free", "14:00:appointment", "17:00:blocked"]);
  });

  it("pas de créneau le dimanche", () => {
    expect(daySchedule("a1", "2026-10-18", [], [])).toEqual([]);
  });

  it("créneaux libres à partir d'une date", () => {
    const slots = freeSlots("a1", [appt("2026-10-15", "10:00", 1)], [], "2026-10-15", 1, new Date("2026-10-15T08:00:00"));
    expect(slots).toEqual([
      { date: "2026-10-15", time: "14:00" },
      { date: "2026-10-15", time: "17:00" },
    ]);
  });
});
