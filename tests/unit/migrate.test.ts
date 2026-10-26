import { describe, expect, it } from "vitest";
import { withoutDemoData } from "@/lib/store/migrate";

describe("nettoyage des données de démonstration", () => {
  it("retire les demandes, conversations, rendez-vous et notifications de démo", () => {
    const state = {
      session: { role: "client", name: "Thomas" },
      favorites: ["a001"],
      requests: [{ id: "r1" }, { id: "r8" }, { id: "r-lx2abcde" }],
      conversations: [{ id: "c-r1" }, { id: "c-r-lx2abcde" }],
      appointments: [{ id: "ap1" }, { id: "ap4" }],
      notifications: [{ id: "n1" }, { id: "n6" }, { id: "n-lx2abcde" }],
    };
    const clean = withoutDemoData(state);
    expect(clean.requests).toEqual([{ id: "r-lx2abcde" }]);
    expect(clean.conversations).toEqual([{ id: "c-r-lx2abcde" }]);
    expect(clean.appointments).toEqual([]);
    expect(clean.notifications).toEqual([{ id: "n-lx2abcde" }]);
    expect(clean.session).toEqual(state.session);
    expect(clean.favorites).toEqual(["a001"]);
  });

  it("ignore un état vide ou invalide", () => {
    expect(withoutDemoData(null)).toBeNull();
    expect(withoutDemoData(undefined)).toBeUndefined();
  });
});
