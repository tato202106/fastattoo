import { describe, expect, it } from "vitest";
import {
  accountIdFromArtistId,
  budgetLabel,
  newMessageEmail,
  newRequestEmailToArtist,
  parseMessage,
  parseNewRequest,
  requestConfirmationEmail,
} from "@/lib/requests/model";

const valid = {
  artistId: "acc-12",
  name: "Camille",
  email: "Camille@Example.fr ",
  phone: "06 12 34 56 78",
  description: "Une pivoine fine sur l'épaule",
  styles: ["floral", "fine-line", "pas-un-style"],
  zone: "epaule",
  size: "medium",
  budgetMin: 100,
  budgetMax: 200,
  dates: ["2026-11-03", "pas-une-date"],
  inspirations: [
    { id: "x", base: "/media/u/abc123", width: 800, height: 600, color: "#aabbcc", alt: "ref" },
    { id: "y", base: "https://ailleurs.example/img", width: 800, height: 600, color: "#000", alt: "" },
  ],
};

describe("demandes de projet : vrais tatoueurs", () => {
  it("reconnaît un vrai tatoueur (acc-N) et pas un profil d'exemple", () => {
    expect(accountIdFromArtistId("acc-12")).toBe(12);
    expect(accountIdFromArtistId("a001")).toBeNull();
    expect(accountIdFromArtistId("acc-")).toBeNull();
    expect(accountIdFromArtistId(12)).toBeNull();
  });

  it("nettoie une demande valide", () => {
    expect(parseNewRequest({ ...valid, zone: "genou" }).ok).toBe(false);
    const ok = parseNewRequest(valid);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.clientEmail).toBe("camille@example.fr");
    expect(ok.value.styles).toEqual(["floral", "fine-line"]);
    expect(ok.value.dates).toEqual(["2026-11-03"]);
    // Seules nos propres images sont acceptées.
    expect(ok.value.inspirations.map((i) => i.base)).toEqual(["/media/u/abc123"]);
  });

  it("refuse un e-mail invalide ou une description vide", () => {
    const r = parseNewRequest({ ...valid, email: "pas-un-mail", description: "court" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.email).toBeTruthy();
      expect(r.errors.description).toBeTruthy();
    }
  });

  it("vérifie les messages et les propositions de rendez-vous", () => {
    expect(parseMessage({ text: "  Bonjour !  " }, { allowSlot: false })).toEqual({ ok: true, text: "Bonjour !", slot: null });
    expect(parseMessage({ text: "" }, { allowSlot: false }).ok).toBe(false);
    expect(parseMessage({ text: "", slot: { date: "2026-11-03", time: "14:30" } }, { allowSlot: true })).toEqual({
      ok: true,
      text: "",
      slot: { date: "2026-11-03", time: "14:30" },
    });
    expect(parseMessage({ text: "ok", slot: { date: "2026-11-03", time: "25:00" } }, { allowSlot: true }).ok).toBe(false);
    // Le client ne peut pas proposer de rendez-vous : le créneau est ignoré.
    expect(parseMessage({ text: "ok", slot: { date: "2026-11-03", time: "14:30" } }, { allowSlot: false })).toEqual({ ok: true, text: "ok", slot: null });
  });

  it("écrit des e-mails avec le lien de la conversation", () => {
    const parsed = parseNewRequest(valid);
    if (!parsed.ok) throw new Error("demande invalide");
    const request = parsed.value;
    const toArtist = newRequestEmailToArtist(request, "https://fastattoo.test/espace-tatoueur/demandes/1");
    expect(toArtist.subject).toContain("Camille");
    expect(toArtist.text).toContain("https://fastattoo.test/espace-tatoueur/demandes/1");
    expect(toArtist.text).not.toContain("camille@example.fr");

    const toClient = requestConfirmationEmail(request, "Léa", "https://fastattoo.test/demande/abc");
    expect(toClient.text).toContain("https://fastattoo.test/demande/abc");

    const reply = newMessageEmail({ to: "client", fromName: "Léa", text: "Avec plaisir", slot: { date: "2026-11-03", time: "14:30" }, link: "L" });
    expect(reply.subject).toBe("Léa te propose un rendez-vous");
    expect(reply.text).toContain("14h30");
  });

  it("affiche le budget lisiblement", () => {
    expect(budgetLabel(50, 100)).toBe("Moins de 100 €");
    expect(budgetLabel(100, 200)).toBe("100 – 200 €");
    expect(budgetLabel(500, 1000)).toBe("Plus de 500 €");
  });
});
