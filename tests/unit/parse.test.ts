import { describe, expect, it } from "vitest";
import { nameScore, parseQuery } from "@/lib/search/parse";

const NAMES = ["Léa Ink", "Malo Noir", "Atelier Lin", "Sofia Line", "Nina Mini"];

describe("parseQuery", () => {
  it("reconnaît style + ville : « Fine Line Nantes »", () => {
    const q = parseQuery("Fine Line Nantes", NAMES);
    expect(q.styles).toEqual(["fine-line"]);
    expect(q.city?.slug).toBe("nantes");
    expect(q.text).toBe("");
  });

  it("reconnaît catégorie + style : « Tatoueur blackwork »", () => {
    const q = parseQuery("Tatoueur blackwork", NAMES);
    expect(q.styles).toEqual(["blackwork"]);
    expect(q.categories).toEqual(["artist"]);
    expect(q.city).toBeNull();
    expect(q.text).toBe("");
  });

  it("reconnaît un nom de tatoueur : « Léa Ink » (sans le découper en style)", () => {
    const q = parseQuery("Léa Ink", NAMES);
    expect(q.text).toBe("lea ink");
    expect(q.styles).toEqual([]);
  });

  it("tolère accents et casse : « REALISME lyon », « réalisme Lyon »", () => {
    for (const raw of ["REALISME lyon", "réalisme Lyon", "Réaliste à LYON"]) {
      const q = parseQuery(raw, NAMES);
      expect(q.styles).toEqual(["realisme"]);
      expect(q.city?.slug).toBe("lyon");
    }
  });

  it("tolère une faute de frappe légère : « blakwork bordeau »", () => {
    const q = parseQuery("blakwork bordeau", NAMES);
    expect(q.styles).toEqual(["blackwork"]);
    expect(q.city?.slug).toBe("bordeaux");
  });

  it("garde un nom composé avant les styles : « Malo Noir Nantes »", () => {
    const q = parseQuery("Malo Noir Nantes", NAMES);
    expect(q.text).toBe("malo noir");
    expect(q.styles).toEqual([]);
    expect(q.city?.slug).toBe("nantes");
  });

  it("plusieurs styles + mots vides : « tatouage japonais et old school à Paris »", () => {
    const q = parseQuery("tatouage japonais et old school à Paris", NAMES);
    expect(q.styles.sort()).toEqual(["japonais", "old-school"]);
    expect(q.city?.slug).toBe("paris");
    expect(q.text).toBe("");
  });

  it("saisie vide", () => {
    const q = parseQuery("   ", NAMES);
    expect(q).toMatchObject({ city: null, styles: [], text: "" });
  });
});

describe("nameScore", () => {
  it("classe correspondance exacte > préfixe > mot > studio > approximatif", () => {
    expect(nameScore("lea ink", "Léa Ink")).toBe(100);
    expect(nameScore("lea", "Léa Ink")).toBe(80);
    expect(nameScore("ink", "Léa Ink")).toBe(60);
    expect(nameScore("atelier", "Léa Ink", "Atelier Lin")).toBe(50);
    expect(nameScore("lae ink", "Léa Ink")).toBeGreaterThan(0);
    expect(nameScore("zzz", "Léa Ink")).toBe(0);
  });
});
