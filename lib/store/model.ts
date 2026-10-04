import type { BodyZone, ImageAsset, PortfolioItem, Review, StyleSlug } from "../types";

/** Modèles de données des Phases 3–5 (stockés côté client pour la démo). */

export type Role = "client" | "artist";

export interface Session {
  role: Role;
  /** Identifiant du client (rôle client) ou du tatoueur (rôle artiste). */
  userId: string;
  name: string;
  email: string;
}

export type TattooSize = "small" | "medium" | "large";
export const TATTOO_SIZES: { value: TattooSize; label: string; hint: string }[] = [
  { value: "small", label: "Petit", hint: "moins de 5 cm" },
  { value: "medium", label: "Moyen", hint: "5 à 15 cm" },
  { value: "large", label: "Grand", hint: "plus de 15 cm" },
];

export type RequestStatus = "new" | "accepted" | "proposed" | "booked" | "declined";

export interface ProjectRequest {
  id: string;
  artistId: string;
  artistName: string;
  clientId: string;
  clientName: string;
  description: string;
  styles: StyleSlug[];
  zone: BodyZone;
  size: TattooSize;
  budgetMin: number;
  budgetMax: number;
  /** Dates préférées (YYYY-MM-DD) ; vide = flexible. */
  dates: string[];
  inspirations: ImageAsset[];
  status: RequestStatus;
  createdAt: number;
  conversationId: string;
}

export type Sender = "client" | "artist" | "system";

export interface Proposal {
  date: string;
  time: string;
  durationH: number;
  status: "pending" | "accepted" | "declined";
  appointmentId?: string;
}

export type MessageBody =
  | { kind: "text"; text: string }
  | { kind: "photo"; image: ImageAsset; text?: string }
  | { kind: "reference"; image: ImageAsset; text?: string }
  | { kind: "price"; amount: number; label: string }
  | { kind: "proposal"; proposal: Proposal }
  | { kind: "request"; requestId: string };

export type Message = MessageBody & { id: string; from: Sender; at: number };

export interface Conversation {
  id: string;
  artistId: string;
  artistName: string;
  artistSlug: string;
  artistAvatar: ImageAsset;
  clientId: string;
  clientName: string;
  requestId?: string;
  messages: Message[];
  unread: { client: number; artist: number };
}

export interface Appointment {
  id: string;
  artistId: string;
  artistName: string;
  artistSlug: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  durationH: number;
  label: string;
  status: "confirmed" | "cancelled";
  conversationId?: string;
  reviewed?: boolean;
}

export interface AppNotification {
  id: string;
  audience: Role;
  /** Destinataire : id client ou id tatoueur. */
  recipientId: string;
  title: string;
  body?: string;
  href: string;
  at: number;
  read: boolean;
}

export interface CalendarBlock {
  artistId: string;
  date: string;
  time: string;
}

export interface LocalPortfolioItem extends PortfolioItem {
  artistId: string;
  addedAt: number;
}

export interface LocalReview extends Review {
  artistId: string;
  appointmentId: string;
}

export interface ArtistProfileDraft {
  name: string;
  city: string;
  styles: StyleSlug[];
  priceFrom: number;
  bio: string;
  instagram: string;
  onboarded: boolean;
}

/** Créneaux standards d'une journée de travail (calendrier simplifié, SPEC §24). */
export const DAY_SLOTS = ["10:00", "14:00", "17:00"] as const;
