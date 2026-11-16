import { describe, expect, it } from "vitest";
import { encodeQr, qrCapacity, qrPath, qrSvg } from "@/lib/qr";

/** Lit un module en tenant compte de la matrice (true = noir). */
const at = (m: boolean[][], x: number, y: number) => m[y]![x]!;

describe("QR code", () => {
  it("capacités du niveau M conformes à la norme (versions 1 à 10)", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(qrCapacity)).toEqual([14, 26, 42, 62, 84, 106, 122, 152, 180, 213]);
  });

  it("choisit la plus petite version possible", () => {
    expect(encodeQr("a")).toHaveLength(21); // version 1
    expect(encodeQr("x".repeat(14))).toHaveLength(21);
    expect(encodeQr("x".repeat(15))).toHaveLength(25); // version 2
    const url = "https://www.fastattoo.com/tatoueurs/marie-dupont-lyon-12?utm_source=qr&utm_medium=kit-tatoueur";
    expect(encodeQr(url).length).toBe(4 * 6 + 17); // 95 octets : version 6
  });

  it("dessine les trois repères de coin", () => {
    const m = encodeQr("https://www.fastattoo.com");
    const n = m.length;
    for (const [cx, cy] of [
      [3, 3],
      [n - 4, 3],
      [3, n - 4],
    ] as const) {
      expect(at(m, cx, cy)).toBe(true); // centre noir
      expect(at(m, cx + 2, cy)).toBe(false); // anneau blanc
      expect(at(m, cx + 3, cy)).toBe(true); // bord noir
    }
    expect(at(m, 8, n - 8)).toBe(true); // module noir obligatoire
  });

  it("est déterministe et refuse un texte trop long", () => {
    expect(encodeQr("fastattoo")).toEqual(encodeQr("fastattoo"));
    expect(() => encodeQr("x".repeat(214))).toThrow();
  });

  it("produit un SVG avec marge blanche", () => {
    const svg = qrSvg("fastattoo");
    expect(svg).toContain('viewBox="0 0 29 29"');
    expect(svg).toContain('fill="#ffffff"');
    expect(qrPath([[true, true, false, true]], 1)).toBe("M1 1h2v1h-2zM4 1h1v1h-1z");
  });
});
