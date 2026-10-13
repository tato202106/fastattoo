import { describe, expect, it } from "vitest";
import { parseSignup } from "@/lib/signup";
import { signupEmail } from "@/lib/signup-notify";

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

describe("signupEmail", () => {
  it("résume l'inscription sans lignes vides inutiles", () => {
    const r = parseSignup(valid);
    if (!r.ok) throw new Error("inscription invalide");
    const mail = signupEmail(r.value);
    expect(mail.subject).toBe("Nouvelle inscription : Léa Ink (Nantes)");
    expect(mail.text).toContain("Styles : Fine Line");
    expect(mail.text).not.toContain("Studio :");
  });
});

describe("parrainage", () => {
  it("garde le parrain indiqué et le signale dans l'alerte", () => {
    const r = parseSignup({ ...valid, referrer: " @lea.ink " });
    if (!r.ok) throw new Error("inscription invalide");
    expect(r.value.referrer).toBe("@lea.ink");
    const mail = signupEmail(r.value);
    expect(mail.subject).toContain("parrainage");
    expect(mail.text).toContain("Parrainé·e par : @lea.ink");
  });
});
