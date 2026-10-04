/**
 * État de démonstration des Phases 3–5 (demandes, conversations, rendez-vous,
 * notifications). Construit relativement à la date du jour pour que le
 * dashboard reste vivant (« 2 rendez-vous aujourd'hui », etc.).
 */
import { artAsset, avatarAsset } from "../art/assets";
import { DEMO_ARTIST_ID } from "../data/ids";
import { addDays, todayISO } from "../dates";
import type { ImageAsset } from "../types";
import type { Appointment, AppNotification, Conversation, ProjectRequest } from "./model";

import { CLIENT_ID, DEMO_CLIENT_NAME } from "./ids";

export { artAsset, avatarAsset, CLIENT_ID, DEMO_ARTIST_ID, DEMO_CLIENT_NAME };

export const DEMO_ARTISTS = {
  lea: { id: DEMO_ARTIST_ID, name: "Léa Ink", slug: "lea-ink", avatar: avatarAsset(1, "Léa Ink") },
  yanis: { id: "a006", name: "Yanis Real", slug: "yanis-real", avatar: avatarAsset(6, "Yanis Real") },
  sofia: { id: "a007", name: "Sofia Line", slug: "sofia-line", avatar: avatarAsset(7, "Sofia Line") },
};

export interface DemoState {
  requests: ProjectRequest[];
  conversations: Conversation[];
  appointments: Appointment[];
  notifications: AppNotification[];
}

export function buildDemoState(now = Date.now()): DemoState {
  const today = todayISO(new Date(now));
  const min = 60_000;
  const h = 60 * min;
  const d = 24 * h;
  const { lea, yanis, sofia } = DEMO_ARTISTS;

  const conv = (
    id: string,
    artist: { id: string; name: string; slug: string; avatar: ImageAsset },
    clientId: string,
    clientName: string,
    requestId: string | undefined,
    messages: Conversation["messages"],
    unread: Conversation["unread"],
  ): Conversation => ({ id, artistId: artist.id, artistName: artist.name, artistSlug: artist.slug, artistAvatar: artist.avatar, clientId, clientName, requestId, messages, unread });

  const req = (
    id: string,
    artist: { id: string; name: string },
    clientId: string,
    clientName: string,
    p: Pick<ProjectRequest, "description" | "styles" | "zone" | "size" | "budgetMin" | "budgetMax" | "status"> & { ago: number; dates?: string[]; inspirations?: ImageAsset[] },
  ): ProjectRequest => ({
    id,
    artistId: artist.id,
    artistName: artist.name,
    clientId,
    clientName,
    description: p.description,
    styles: p.styles,
    zone: p.zone,
    size: p.size,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    dates: p.dates ?? [],
    inspirations: p.inspirations ?? [],
    status: p.status,
    createdAt: now - p.ago,
    conversationId: `c-${id}`,
  });

  const requests: ProjectRequest[] = [
    req("r1", lea, CLIENT_ID, DEMO_CLIENT_NAME, {
      description: "Une branche d'olivier fine qui suit l'avant-bras, avec deux petites feuilles qui retombent.",
      styles: ["fine-line"], zone: "avant-bras", size: "medium", budgetMin: 200, budgetMax: 300, status: "booked", ago: 9 * d,
      inspirations: [artAsset("fine-line", 101, "Inspiration fine line")],
    }),
    req("r2", sofia, CLIENT_ID, DEMO_CLIENT_NAME, {
      description: "Un petit croissant de lune minimaliste derrière l'oreille.",
      styles: ["minimaliste"], zone: "nuque", size: "small", budgetMin: 80, budgetMax: 120, status: "proposed", ago: 2 * d,
    }),
    req("r3", yanis, CLIENT_ID, DEMO_CLIENT_NAME, {
      description: "Portrait réaliste de mon chien, noir et gris.",
      styles: ["realisme"], zone: "bras", size: "large", budgetMin: 400, budgetMax: 600, status: "booked", ago: 40 * d,
    }),
    req("r4", lea, "client-camille", "Camille", {
      description: "Bouquet de pivoines sur l'épaule, style floral délicat.",
      styles: ["floral"], zone: "epaule", size: "medium", budgetMin: 150, budgetMax: 250, status: "new", ago: 2 * h,
      dates: [addDays(today, 6), addDays(today, 8)], inspirations: [artAsset("floral", 103, "Inspiration pivoines")],
    }),
    req("r5", lea, "client-hugo", "Hugo", {
      description: "Une petite vague minimaliste sur la cheville.",
      styles: ["minimaliste", "fine-line"], zone: "cheville", size: "small", budgetMin: 80, budgetMax: 120, status: "new", ago: 5 * h,
    }),
    req("r6", lea, "client-mehdi", "Mehdi", {
      description: "Branche de lavande sur les côtes, le plus fin possible.",
      styles: ["fine-line", "floral"], zone: "cote", size: "medium", budgetMin: 200, budgetMax: 300, status: "new", ago: 26 * h,
    }),
    req("r7", lea, "client-sarah", "Sarah", {
      description: "Les initiales de mes enfants entrelacées avec une petite fleur.",
      styles: ["fine-line"], zone: "avant-bras", size: "small", budgetMin: 100, budgetMax: 150, status: "new", ago: 30 * h,
    }),
    req("r8", lea, "client-julie", "Julie", {
      description: "Couronne de fleurs sauvages autour du poignet.",
      styles: ["floral", "fine-line"], zone: "main", size: "medium", budgetMin: 180, budgetMax: 260, status: "accepted", ago: 3 * d,
    }),
  ];

  const leaToday1: Appointment = {
    id: "ap1", artistId: lea.id, artistName: lea.name, artistSlug: lea.slug, clientId: CLIENT_ID, clientName: DEMO_CLIENT_NAME,
    date: today, time: "14:00", durationH: 2, label: "Fine Line · Avant-bras", status: "confirmed", conversationId: "c-r1",
  };
  const appointments: Appointment[] = [
    leaToday1,
    {
      id: "ap2", artistId: lea.id, artistName: lea.name, artistSlug: lea.slug, clientId: "client-pauline", clientName: "Pauline",
      date: today, time: "18:30", durationH: 1, label: "Minimaliste · Poignet", status: "confirmed",
    },
    {
      id: "ap3", artistId: lea.id, artistName: lea.name, artistSlug: lea.slug, clientId: "client-antoine", clientName: "Antoine",
      date: addDays(today, 2), time: "10:00", durationH: 3, label: "Floral · Dos", status: "confirmed",
    },
    {
      id: "ap4", artistId: yanis.id, artistName: yanis.name, artistSlug: yanis.slug, clientId: CLIENT_ID, clientName: DEMO_CLIENT_NAME,
      date: addDays(today, -12), time: "14:00", durationH: 4, label: "Réalisme · Bras", status: "confirmed", conversationId: "c-r3",
    },
  ];

  const conversations: Conversation[] = [
    conv("c-r1", lea, CLIENT_ID, DEMO_CLIENT_NAME, "r1", [
      { id: "m1", from: "client", at: now - 9 * d, kind: "request", requestId: "r1" },
      { id: "m2", from: "artist", at: now - 9 * d + 3 * h, kind: "text", text: "Hello Thomas ! J'adore l'idée de l'olivier, ça va être super fin sur l'avant-bras 🌿" },
      { id: "m3", from: "artist", at: now - 9 * d + 3 * h + 2 * min, kind: "reference", image: artAsset("fine-line", 104, "Branche fine line"), text: "Un peu dans cet esprit ?" },
      { id: "m4", from: "client", at: now - 8 * d, kind: "text", text: "Oui exactement, avec des feuilles un peu plus longues." },
      { id: "m5", from: "artist", at: now - 8 * d + h, kind: "price", amount: 240, label: "Pièce fine line, avant-bras, ~2 h" },
      { id: "m6", from: "artist", at: now - 8 * d + h + min, kind: "proposal", proposal: { date: today, time: "14:00", durationH: 2, status: "accepted", appointmentId: "ap1" } },
      { id: "m7", from: "system", at: now - 8 * d + 2 * h, kind: "text", text: "Rendez-vous confirmé" },
      { id: "m8", from: "artist", at: now - 3 * h, kind: "text", text: "À tout à l'heure ! Pense à bien t'hydrater et à manger avant la séance 🙂" },
    ], { client: 1, artist: 0 }),
    conv("c-r2", sofia, CLIENT_ID, DEMO_CLIENT_NAME, "r2", [
      { id: "m1", from: "client", at: now - 2 * d, kind: "request", requestId: "r2" },
      { id: "m2", from: "artist", at: now - 1 * d, kind: "text", text: "Coucou ! Petit et discret, c'est parfait pour cet emplacement." },
      { id: "m3", from: "artist", at: now - 1 * d + min, kind: "price", amount: 100, label: "Minimaliste, nuque" },
      { id: "m4", from: "artist", at: now - 1 * d + 2 * min, kind: "proposal", proposal: { date: addDays(today, 4), time: "17:00", durationH: 1, status: "pending" } },
    ], { client: 3, artist: 0 }),
    conv("c-r3", yanis, CLIENT_ID, DEMO_CLIENT_NAME, "r3", [
      { id: "m1", from: "client", at: now - 40 * d, kind: "request", requestId: "r3" },
      { id: "m2", from: "artist", at: now - 39 * d, kind: "text", text: "Envoie-moi 2 ou 3 photos nettes de ton chien, de face si possible." },
      { id: "m3", from: "artist", at: now - 30 * d, kind: "proposal", proposal: { date: addDays(today, -12), time: "14:00", durationH: 4, status: "accepted", appointmentId: "ap4" } },
      { id: "m4", from: "system", at: now - 30 * d + h, kind: "text", text: "Rendez-vous confirmé" },
      { id: "m5", from: "artist", at: now - 11 * d, kind: "text", text: "Merci pour ta confiance ! Envoie-moi une photo une fois cicatrisé 🙏" },
    ], { client: 0, artist: 0 }),
    conv("c-r4", lea, "client-camille", "Camille", "r4", [{ id: "m1", from: "client", at: now - 2 * h, kind: "request", requestId: "r4" }], { client: 0, artist: 1 }),
    conv("c-r5", lea, "client-hugo", "Hugo", "r5", [{ id: "m1", from: "client", at: now - 5 * h, kind: "request", requestId: "r5" }], { client: 0, artist: 1 }),
    conv("c-r6", lea, "client-mehdi", "Mehdi", "r6", [{ id: "m1", from: "client", at: now - 26 * h, kind: "request", requestId: "r6" }], { client: 0, artist: 0 }),
    conv("c-r7", lea, "client-sarah", "Sarah", "r7", [{ id: "m1", from: "client", at: now - 30 * h, kind: "request", requestId: "r7" }], { client: 0, artist: 0 }),
    conv("c-r8", lea, "client-julie", "Julie", "r8", [
      { id: "m1", from: "client", at: now - 3 * d, kind: "request", requestId: "r8" },
      { id: "m2", from: "system", at: now - 3 * d + h, kind: "text", text: "Léa a accepté la demande" },
      { id: "m3", from: "artist", at: now - 3 * d + h + min, kind: "text", text: "Avec plaisir Julie ! Tu as une préférence pour les fleurs ?" },
      { id: "m4", from: "client", at: now - 40 * min, kind: "text", text: "Plutôt coquelicots et camomille 🌼" },
      { id: "m5", from: "client", at: now - 38 * min, kind: "text", text: "Et si possible un rendez-vous un samedi" },
    ], { client: 0, artist: 2 }),
  ];

  const notifications: AppNotification[] = [
    { id: "n1", audience: "client", recipientId: CLIENT_ID, title: "Léa a répondu à votre demande.", body: "À tout à l'heure ! Pense à bien t'hydrater…", href: "/messages/c-r1", at: now - 3 * h, read: false },
    { id: "n2", audience: "client", recipientId: CLIENT_ID, title: "Sofia vous propose un créneau.", body: "Rendez-vous proposé dans 4 jours à 17h", href: "/messages/c-r2", at: now - 1 * d, read: false },
    { id: "n3", audience: "client", recipientId: CLIENT_ID, title: "Votre rendez-vous est confirmé.", body: "Léa Ink · aujourd'hui à 14h", href: "/messages/c-r1", at: now - 8 * d, read: true },
    { id: "n4", audience: "artist", recipientId: lea.id, title: "Nouvelle demande de Camille", body: "Bouquet de pivoines sur l'épaule", href: "/pro/demandes/r4", at: now - 2 * h, read: false },
    { id: "n5", audience: "artist", recipientId: lea.id, title: "Nouveau message de Julie", body: "Et si possible un rendez-vous un samedi", href: "/messages/c-r8", at: now - 38 * min, read: false },
    { id: "n6", audience: "artist", recipientId: lea.id, title: "Nouvelle demande de Hugo", body: "Une petite vague minimaliste sur la cheville", href: "/pro/demandes/r5", at: now - 5 * h, read: true },
  ];

  return { requests, conversations, appointments, notifications };
}
