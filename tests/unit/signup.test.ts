import { describe, expect, it } from "vitest";
import { parseSignup } from "@/lib/signup";

const valid = { name: "Léa Ink", city: "Nantes", email: "LEA@exemple.fr ", styles: ["fine-line", "inconnu"], priceFrom: "90", instagram: "@lea.ink", consent: true };

describe("parseSignup", () => {
  it("accepte et nettoie une inscription valide", () => {
    const r = parseSignup(valid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.email).toBe("lea@exemple.fr");
    expect(r.value.styles).toEqual(["fine-line"]);
    expect(r.value.priceFrom).toBe(90);
    expect(r.value.instagram).toBe("lea.ink");
  });

  it("refuse sans accord, sans style ou avec un e-mail invalide", () => {
    const r = parseSignup({ ...valid, email: "pas-un-mail", styles: [], consent: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "styles"]);
  });
});
