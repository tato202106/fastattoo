import { describe, expect, it } from "vitest";
import { canRequestFlash, demoFlashes, type Flash, flashRequestDescription, parseFlashInput, publicFlashes } from "@/lib/flashes";
import { budgetLabel } from "@/lib/requests/model";

const flash = (id: string, status: Flash["status"]): Flash => ({
  id,
  image: { id, base: `/media/u/${id}`, width: 800, height: 800, color: "#eee", alt: "" },
  title: id,
  price: 100,
  size: "small",
  style: "fine-line",
  unique: true,
  status,
});

describe("flashs", () => {
  it("valide les champs envoyés par le tatoueur", () => {
    const ok = parseFlashInput({ title: "  Petite   hirondelle ", price: "120", size: "medium", style: "old-school", unique: "true" }, "fine-line");
    expect(ok).toEqual({ ok: true, value: { title: "Petite hirondelle", price: 120, size: "medium", style: "old-school", unique: true } });
    const defaults = parseFlashInput({ title: "Rose", price: 90, size: "énorme", style: "inconnu" }, "floral");
    expect(defaults).toEqual({ ok: true, value: { title: "Rose", price: 90, size: "small", style: "floral", unique: false } });
  });

  it("refuse un titre ou un prix invalide", () => {
    expect(parseFlashInput({ title: "R", price: 100 }, "floral").ok).toBe(false);
    expect(parseFlashInput({ title: "Rose", price: 5 }, "floral").ok).toBe(false);
    expect(parseFlashInput({ title: "Rose", price: "abc" }, "floral").ok).toBe(false);
    expect(parseFlashInput({ title: "Rose", price: 5000 }, "floral").ok).toBe(false);
  });

  it("le profil montre les disponibles d'abord, cache les flashs déjà tatoués", () => {
    const list = publicFlashes([flash("a", "reserved"), flash("b", "done"), flash("c", "available")]);
    expect(list.map((f) => f.id)).toEqual(["c", "a"]);
    expect(canRequestFlash(flash("a", "reserved"))).toBe(false);
    expect(canRequestFlash(flash("c", "available"))).toBe(true);
  });

  it("pré-remplit la demande et affiche le prix fixe", () => {
    expect(flashRequestDescription({ title: "Hirondelle", price: 120, unique: true })).toBe("Je voudrais ton flash « Hirondelle » (120 €, pièce unique).");
    expect(budgetLabel(120, 120)).toBe("120 € (prix fixe)");
    expect(budgetLabel(1200, 1200)).toBe("1200 € (prix fixe)");
  });

  it("flashs d'exemple stables pour les profils de démo", () => {
    const a = { id: "demo-12", styles: ["japonais", "blackwork"] as Flash["style"][], priceFrom: 90 };
    const list = demoFlashes(a);
    expect(list).toHaveLength(4);
    expect(demoFlashes(a)).toEqual(list);
    expect(new Set(list.map((f) => f.id)).size).toBe(4);
    for (const f of list) {
      expect(["japonais", "blackwork"]).toContain(f.style);
      expect(f.price).toBeGreaterThanOrEqual(90);
    }
    expect(publicFlashes(list).at(-1)?.status).toBe("reserved");
  });
});
