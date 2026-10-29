/**
 * Pays où un tatoueur peut s'inscrire. Le pays sert à localiser correctement
 * son adresse (ex. « Mons » existe en Belgique et en France).
 */
export const COUNTRIES = [
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const DEFAULT_COUNTRY: CountryCode = "FR";

const CODES = new Set<string>(COUNTRIES.map((c) => c.code));

/** Valeur envoyée par un formulaire → code pays connu (France par défaut). */
export function parseCountry(v: unknown): CountryCode {
  const code = typeof v === "string" ? v.trim().toUpperCase() : "";
  return CODES.has(code) ? (code as CountryCode) : DEFAULT_COUNTRY;
}

export function countryName(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
