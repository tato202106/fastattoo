/**
 * Informations légales affichées sur /mentions-legales, /confidentialite et /cgv.
 * À COMPLÉTER avant de publier. Un champ vide s'affiche « [à compléter] ».
 */
export const LEGAL = {
  /** Nom et prénom de l'éditeur (ou nom de la société). */
  publisherName: "",
  /** Statut : « Entrepreneur individuel (micro-entreprise) », « SAS », etc. */
  publisherStatus: "",
  /** Adresse postale de l'éditeur (ou de domiciliation). */
  publisherAddress: "",
  /** Numéro SIRET (14 chiffres), dès qu'il est attribué. */
  siret: "",
  /** Mention TVA. En micro-entreprise, en général : « TVA non applicable, art. 293 B du CGI ». */
  vatMention: "TVA non applicable, art. 293 B du CGI",
  /** Adresse e-mail de contact affichée sur le site. */
  contactEmail: "",
  /** Date de dernière mise à jour des textes (AAAA-MM-JJ). */
  updatedAt: "2026-10-11",
};

export const HOSTING = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
};

export function legalValue(v: string): string {
  return v.trim() || "[à compléter]";
}

export function formatLegalDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
