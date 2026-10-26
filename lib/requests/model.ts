import { formatLongDate } from "../dates";
import { TATTOO_SIZES, type TattooSize } from "../store/model";
import { BODY_ZONES, isStyleSlug, styleLabel, zoneLabel } from "../styles";
import type { BodyZone, ImageAsset, StyleSlug } from "../types";

/**
 * Demandes de projet envoyées aux vrais tatoueurs (logique pure, testée).
 * La demande et les messages sont enregistrés dans Neon (lib/requests/db.ts) ;
 * le client suit la conversation par un lien privé, le tatoueur dans son espace.
 */

export type RequestStatus = "new" | "replied" | "proposed" | "booked" | "declined";
export type Sender = "client" | "artist";

export interface NewRequest {
  artistId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  description: string;
  styles: StyleSlug[];
  zone: BodyZone;
  size: TattooSize;
  budgetMin: number;
  budgetMax: number;
  dates: string[];
  inspirations: ImageAsset[];
}

export interface RequestMessage {
  id: number;
  at: string;
  from: Sender;
  body: string;
  /** Proposition de rendez-vous (AAAA-MM-JJ + HH:MM). */
  slot: { date: string; time: string } | null;
}

export interface RequestThread {
  id: number;
  createdAt: string;
  status: RequestStatus;
  artistId: string;
  artistName: string;
  artistSlug: string;
  clientName: string;
  clientPhone: string;
  description: string;
  styles: StyleSlug[];
  zone: BodyZone;
  size: TattooSize;
  budgetMin: number;
  budgetMax: number;
  dates: string[];
  inspirations: ImageAsset[];
  messages: RequestMessage[];
  /** Messages de l'autre personne pas encore lus (du point de vue de celui qui consulte). */
  unread: number;
}

export const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Identifiant de compte d'un vrai tatoueur (« acc-12 » → 12), sinon null (profil d'exemple). */
export function accountIdFromArtistId(artistId: unknown): number | null {
  if (typeof artistId !== "string") return null;
  const m = /^acc-(\d{1,9})$/.exec(artistId);
  return m ? Number(m[1]) : null;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function image(v: unknown): ImageAsset | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  // Uniquement nos propres images (envoyées par /api/uploads) : pas d'URL extérieure.
  if (typeof o.base !== "string" || !/^\/media\/u\/[A-Za-z0-9_-]{1,80}$/.test(o.base)) return null;
  const width = Number(o.width);
  const height = Number(o.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return {
    id: str(o.id, 80) || o.base.slice(9),
    base: o.base,
    width: Math.round(width),
    height: Math.round(height),
    color: /^#[0-9a-fA-F]{3,8}$/.test(String(o.color)) ? String(o.color) : "#d9d4cc",
    alt: str(o.alt, 120),
  };
}

/** Vérifie une demande envoyée par le formulaire. Renvoie la demande nettoyée ou les erreurs par champ. */
export function parseNewRequest(body: unknown): { ok: true; value: NewRequest } | { ok: false; errors: Record<string, string> } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const artistId = str(b.artistId, 40);
  if (accountIdFromArtistId(artistId) == null) errors.artistId = "Tatoueur introuvable.";

  const clientName = str(b.name, 80);
  if (clientName.length < 2) errors.name = "Indique ton prénom.";
  const clientEmail = str(b.email, 160).toLowerCase();
  if (!EMAIL_RE.test(clientEmail)) errors.email = "Indique une adresse e-mail valide : c'est là que tu recevras la réponse.";
  const clientPhone = str(b.phone, 30);
  if (clientPhone && !/^[+()\d .-]{6,30}$/.test(clientPhone)) errors.phone = "Numéro de téléphone invalide.";

  const description = str(b.description, 600);
  if (description.length < 8) errors.description = "Décris ton projet en quelques mots.";

  const styles = (Array.isArray(b.styles) ? b.styles : []).filter((s): s is StyleSlug => typeof s === "string" && isStyleSlug(s)).slice(0, 6);
  if (styles.length === 0) errors.styles = "Choisis au moins un style.";

  const zone = BODY_ZONES.find((z) => z.slug === b.zone)?.slug;
  if (!zone) errors.zone = "Choisis l'emplacement.";
  const size = TATTOO_SIZES.find((s) => s.value === b.size)?.value;
  if (!size) errors.size = "Choisis la taille.";

  const budgetMin = Math.round(Number(b.budgetMin));
  const budgetMax = Math.round(Number(b.budgetMax));
  if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMin < 0 || budgetMax < budgetMin || budgetMax > 100000) errors.budget = "Choisis ton budget.";

  const dates = [...new Set((Array.isArray(b.dates) ? b.dates : []).filter((d): d is string => typeof d === "string" && DATE_RE.test(d)))].slice(0, 3);
  const inspirations = (Array.isArray(b.inspirations) ? b.inspirations : []).map(image).filter((i): i is ImageAsset => i != null).slice(0, 5);

  if (Object.keys(errors).length > 0 || !zone || !size) return { ok: false, errors };
  return {
    ok: true,
    value: { artistId, clientName, clientEmail, clientPhone, description, styles, zone, size, budgetMin, budgetMax, dates, inspirations },
  };
}

/** Vérifie un message (texte + éventuelle proposition de rendez-vous). */
export function parseMessage(body: unknown, { allowSlot }: { allowSlot: boolean }): { ok: true; text: string; slot: { date: string; time: string } | null } | { ok: false; error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const text = typeof b.text === "string" ? b.text.trim().slice(0, MESSAGE_MAX) : "";
  let slot: { date: string; time: string } | null = null;
  if (allowSlot && b.slot && typeof b.slot === "object") {
    const s = b.slot as Record<string, unknown>;
    if (typeof s.date !== "string" || !DATE_RE.test(s.date) || typeof s.time !== "string" || !TIME_RE.test(s.time)) return { ok: false, error: "Date ou heure invalide." };
    slot = { date: s.date, time: s.time };
  }
  if (!text && !slot) return { ok: false, error: "Écris un message." };
  return { ok: true, text, slot };
}

export function sizeLabel(size: TattooSize): string {
  return TATTOO_SIZES.find((s) => s.value === size)?.label ?? size;
}

export function budgetLabel(min: number, max: number): string {
  if (max >= 1000) return `Plus de ${min} €`;
  if (min <= 50) return `Moins de ${max} €`;
  return `${min} – ${max} €`;
}

export function slotLabel(slot: { date: string; time: string }): string {
  return `${formatLongDate(slot.date)} à ${slot.time.replace(":", "h")}`;
}

/** Résumé lisible de la demande (e-mails, espace tatoueur). */
export function requestSummaryLines(r: Pick<NewRequest, "description" | "styles" | "zone" | "size" | "budgetMin" | "budgetMax" | "dates" | "inspirations">): string[] {
  return [
    `Projet : ${r.description}`,
    `Style : ${r.styles.map(styleLabel).join(", ")}`,
    `Emplacement : ${zoneLabel(r.zone)}`,
    `Taille : ${sizeLabel(r.size)}`,
    `Budget : ${budgetLabel(r.budgetMin, r.budgetMax)}`,
    `Quand : ${r.dates.length ? r.dates.map((d) => formatLongDate(d)).join(", ") : "flexible"}`,
    `Inspirations : ${r.inspirations.length ? `${r.inspirations.length} photo(s)` : "aucune"}`,
  ];
}

const signature = ["", "L'équipe Fastattoo"];

/** E-mail au tatoueur : nouvelle demande. */
export function newRequestEmailToArtist(r: NewRequest, link: string): { subject: string; text: string } {
  return {
    subject: `Nouvelle demande de projet de ${r.clientName}`,
    text: [
      "Bonjour,",
      "",
      `${r.clientName} t'a envoyé une demande de projet sur Fastattoo :`,
      "",
      ...requestSummaryLines(r),
      "",
      "Lis la demande complète (avec les photos) et réponds depuis ton espace tatoueur :",
      link,
      ...signature,
    ].join("\n"),
  };
}

/** E-mail au client : confirmation de sa demande, avec son lien privé. */
export function requestConfirmationEmail(r: NewRequest, artistName: string, link: string): { subject: string; text: string } {
  return {
    subject: `Ta demande a bien été envoyée à ${artistName}`,
    text: [
      `Bonjour ${r.clientName},`,
      "",
      `Ta demande de projet a bien été envoyée à ${artistName}. Tu recevras un e-mail dès qu'il ou elle te répond.`,
      "",
      "Suis ta demande et échange avec le tatoueur ici (garde ce lien, il est personnel) :",
      link,
      ...signature,
    ].join("\n"),
  };
}

/** E-mail à l'autre personne quand un message arrive. */
export function newMessageEmail(p: { to: Sender; fromName: string; text: string; slot: { date: string; time: string } | null; link: string }): { subject: string; text: string } {
  const what = p.slot ? `te propose un rendez-vous le ${slotLabel(p.slot)}` : "t'a répondu";
  return {
    subject: p.slot ? `${p.fromName} te propose un rendez-vous` : `${p.fromName} t'a répondu`,
    text: [
      "Bonjour,",
      "",
      `${p.fromName} ${what} sur Fastattoo${p.text ? " :" : "."}`,
      ...(p.text ? ["", p.text] : []),
      "",
      p.to === "client" ? "Lis et réponds ici :" : "Lis et réponds depuis ton espace tatoueur :",
      p.link,
      ...signature,
    ].join("\n"),
  };
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Nouvelle",
  replied: "Répondu",
  proposed: "Rendez-vous proposé",
  booked: "Rendez-vous confirmé",
  declined: "Refusée",
};
