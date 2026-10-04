"use client";

/**
 * Store client (Zustand + persistance localStorage).
 *
 * ⚠️ Démo : sans backend utilisateur, les Phases 3–5 (session, favoris,
 * demandes, messagerie, rendez-vous, notifications, ajouts au portfolio)
 * sont conservées sur l'appareil. Les actions ci-dessous sont l'API que le
 * futur backend devra exposer ; l'UI n'appelle que ces actions.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEMO_ARTIST_ID } from "../data/ids";
import { addDays, diffDays, formatTime, relativeDay, todayISO } from "../dates";
import { dispatchExternal } from "../notifications/channels";
import { styleLabel, zoneLabel } from "../styles";
import type { ImageAsset } from "../types";
import { CLIENT_ID, DEMO_CLIENT_NAME } from "./ids";
import type {
  Appointment,
  AppNotification,
  ArtistProfileDraft,
  CalendarBlock,
  Conversation,
  LocalPortfolioItem,
  LocalReview,
  Message,
  MessageBody,
  ProjectRequest,
  Role,
  Sender,
  Session,
} from "./model";

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export interface NewRequestInput extends Omit<ProjectRequest, "id" | "status" | "createdAt" | "conversationId" | "clientId" | "clientName"> {
  artistSlug: string;
  artistAvatar: ImageAsset;
}

interface AppState {
  session: Session | null;
  favorites: string[];
  requests: ProjectRequest[];
  conversations: Conversation[];
  appointments: Appointment[];
  notifications: AppNotification[];
  blocks: CalendarBlock[];
  portfolioAdditions: LocalPortfolioItem[];
  reviews: LocalReview[];
  artistProfile: ArtistProfileDraft | null;
  installDismissedAt: number | null;
  /** Dernière notification reçue pendant la session (affichée en toast). */
  toast: AppNotification | null;
  /** Données de démo chargées (une seule fois, à la première visite). */
  seeded: boolean;

  login(role: Role, name: string, email: string): void;
  logout(): void;
  toggleFavorite(artistId: string): void;

  createRequest(input: NewRequestInput): ProjectRequest;
  acceptRequest(requestId: string): void;
  declineRequest(requestId: string): void;

  sendMessage(conversationId: string, from: Sender, body: MessageBody): void;
  markConversationRead(conversationId: string, side: "client" | "artist"): void;
  proposeSlot(conversationId: string, date: string, time: string, durationH: number): void;
  respondToProposal(conversationId: string, messageId: string, accept: boolean): void;

  toggleBlock(artistId: string, date: string, time: string): void;
  addPortfolioItem(item: LocalPortfolioItem): void;
  removePortfolioItem(id: string): void;
  leaveReview(appointmentId: string, rating: number, text: string): void;
  saveArtistProfile(profile: ArtistProfileDraft): void;

  markNotificationsRead(role: Role, recipientId: string): void;
  dismissToast(): void;
  dismissInstall(): void;
  ensureReminders(): void;
  /** Charge les données de démo (module importé à la demande, hors du bundle initial). */
  seedDemo(force?: boolean): Promise<void>;
  resetDemo(): Promise<void>;
}

function emptyData() {
  return {
    requests: [] as ProjectRequest[],
    conversations: [] as Conversation[],
    appointments: [] as Appointment[],
    notifications: [] as AppNotification[],
    blocks: [] as CalendarBlock[],
    portfolioAdditions: [] as LocalPortfolioItem[],
    reviews: [] as LocalReview[],
  };
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Ajoute une notification in-app et la diffuse sur les autres canaux. */
      const notify = (n: Omit<AppNotification, "id" | "at" | "read">) => {
        const notification: AppNotification = { ...n, id: uid("n"), at: Date.now(), read: false };
        set((s) => {
          const me = s.session;
          const forMe = me && me.role === n.audience && me.userId === n.recipientId;
          return { notifications: [notification, ...s.notifications].slice(0, 100), toast: forMe ? notification : s.toast };
        });
        dispatchExternal(notification);
      };

      const appendMessage = (conversationId: string, from: Sender, body: MessageBody): Message => {
        const message = { ...body, id: uid("m"), from, at: Date.now() } as Message;
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  unread: {
                    client: c.unread.client + (from === "artist" || from === "system" ? 1 : 0),
                    artist: c.unread.artist + (from === "client" || from === "system" ? 1 : 0),
                  },
                }
              : c,
          ),
        }));
        return message;
      };

      const setRequestStatus = (requestId: string | undefined, status: ProjectRequest["status"]) => {
        if (!requestId) return;
        set((s) => ({ requests: s.requests.map((r) => (r.id === requestId ? { ...r, status } : r)) }));
      };

      const firstName = (name: string) => name.split(" ")[0] ?? name;

      return {
        session: null,
        favorites: [],
        ...emptyData(),
        artistProfile: null,
        installDismissedAt: null,
        toast: null,
        seeded: false,

        login(role, name, email) {
          const userId = role === "artist" ? DEMO_ARTIST_ID : CLIENT_ID;
          set({ session: { role, userId, name: name.trim() || (role === "artist" ? "Léa" : DEMO_CLIENT_NAME), email: email.trim() } });
          get().ensureReminders();
        },
        logout() {
          set({ session: null, toast: null });
        },
        toggleFavorite(artistId) {
          set((s) => ({ favorites: s.favorites.includes(artistId) ? s.favorites.filter((id) => id !== artistId) : [artistId, ...s.favorites] }));
        },

        createRequest(input) {
          const session = get().session;
          const clientName = session?.role === "client" ? session.name : DEMO_CLIENT_NAME;
          const id = uid("r");
          const conversationId = `c-${id}`;
          const request: ProjectRequest = {
            id,
            artistId: input.artistId,
            artistName: input.artistName,
            clientId: CLIENT_ID,
            clientName,
            description: input.description,
            styles: input.styles,
            zone: input.zone,
            size: input.size,
            budgetMin: input.budgetMin,
            budgetMax: input.budgetMax,
            dates: input.dates,
            inspirations: input.inspirations,
            status: "new",
            createdAt: Date.now(),
            conversationId,
          };
          const conversation: Conversation = {
            id: conversationId,
            artistId: input.artistId,
            artistName: input.artistName,
            artistSlug: input.artistSlug,
            artistAvatar: input.artistAvatar,
            clientId: CLIENT_ID,
            clientName,
            requestId: id,
            messages: [{ id: uid("m"), from: "client", at: Date.now(), kind: "request", requestId: id }],
            unread: { client: 0, artist: 1 },
          };
          set((s) => ({ requests: [request, ...s.requests], conversations: [conversation, ...s.conversations] }));
          notify({
            audience: "artist",
            recipientId: input.artistId,
            title: `Nouvelle demande de ${firstName(clientName)}`,
            body: `${input.styles.map(styleLabel).join(", ")} · ${zoneLabel(input.zone)}`,
            href: `/pro/demandes/${id}`,
          });
          return request;
        },

        acceptRequest(requestId) {
          const r = get().requests.find((x) => x.id === requestId);
          if (!r) return;
          setRequestStatus(requestId, "accepted");
          appendMessage(r.conversationId, "system", { kind: "text", text: `${firstName(r.artistName)} a accepté la demande` });
          notify({ audience: "client", recipientId: r.clientId, title: `${firstName(r.artistName)} a accepté votre demande.`, href: `/messages/${r.conversationId}` });
        },
        declineRequest(requestId) {
          const r = get().requests.find((x) => x.id === requestId);
          if (!r) return;
          setRequestStatus(requestId, "declined");
          appendMessage(r.conversationId, "system", { kind: "text", text: `${firstName(r.artistName)} n'est pas disponible pour ce projet` });
          notify({ audience: "client", recipientId: r.clientId, title: `${firstName(r.artistName)} a répondu à votre demande.`, href: `/messages/${r.conversationId}` });
        },

        sendMessage(conversationId, from, body) {
          const c = get().conversations.find((x) => x.id === conversationId);
          if (!c) return;
          const hadArtistReply = c.messages.some((m) => m.from === "artist");
          appendMessage(conversationId, from, body);
          if (from === "artist") {
            const request = c.requestId ? get().requests.find((r) => r.id === c.requestId) : undefined;
            notify({
              audience: "client",
              recipientId: c.clientId,
              title: !hadArtistReply && request ? `${firstName(c.artistName)} a répondu à votre demande.` : `Nouveau message de ${firstName(c.artistName)}`,
              body: body.kind === "text" ? body.text : undefined,
              href: `/messages/${c.id}`,
            });
          } else if (from === "client") {
            notify({ audience: "artist", recipientId: c.artistId, title: `Nouveau message de ${firstName(c.clientName)}`, body: body.kind === "text" ? body.text : undefined, href: `/messages/${c.id}` });
          }
        },
        markConversationRead(conversationId, side) {
          set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId && c.unread[side] ? { ...c, unread: { ...c.unread, [side]: 0 } } : c)) }));
        },
        proposeSlot(conversationId, date, time, durationH) {
          const c = get().conversations.find((x) => x.id === conversationId);
          if (!c) return;
          appendMessage(conversationId, "artist", { kind: "proposal", proposal: { date, time, durationH, status: "pending" } });
          setRequestStatus(c.requestId, "proposed");
          notify({
            audience: "client",
            recipientId: c.clientId,
            title: `${firstName(c.artistName)} vous propose un créneau.`,
            body: `${relativeDay(date)} à ${formatTime(time)}`,
            href: `/messages/${c.id}`,
          });
        },
        respondToProposal(conversationId, messageId, accept) {
          const c = get().conversations.find((x) => x.id === conversationId);
          const msg = c?.messages.find((m) => m.id === messageId);
          if (!c || !msg || msg.kind !== "proposal" || msg.proposal.status !== "pending") return;
          const request = c.requestId ? get().requests.find((r) => r.id === c.requestId) : undefined;
          let appointmentId: string | undefined;
          if (accept) {
            appointmentId = uid("ap");
            const appointment: Appointment = {
              id: appointmentId,
              artistId: c.artistId,
              artistName: c.artistName,
              artistSlug: c.artistSlug,
              clientId: c.clientId,
              clientName: c.clientName,
              date: msg.proposal.date,
              time: msg.proposal.time,
              durationH: msg.proposal.durationH,
              label: request ? `${request.styles.map(styleLabel).join(", ")} · ${zoneLabel(request.zone)}` : "Séance",
              status: "confirmed",
              conversationId: c.id,
            };
            set((s) => ({ appointments: [...s.appointments, appointment] }));
          }
          set((s) => ({
            conversations: s.conversations.map((conv) =>
              conv.id !== conversationId
                ? conv
                : {
                    ...conv,
                    messages: conv.messages.map((m) =>
                      m.id === messageId && m.kind === "proposal" ? { ...m, proposal: { ...m.proposal, status: accept ? "accepted" : "declined", appointmentId } } : m,
                    ),
                  },
            ),
          }));
          appendMessage(conversationId, "system", { kind: "text", text: accept ? "Rendez-vous confirmé" : "Créneau refusé" });
          setRequestStatus(c.requestId, accept ? "booked" : "accepted");
          const when = `${relativeDay(msg.proposal.date)} à ${formatTime(msg.proposal.time)}`;
          if (accept) {
            notify({ audience: "client", recipientId: c.clientId, title: "Votre rendez-vous est confirmé.", body: `${c.artistName} · ${when}`, href: `/messages/${c.id}` });
            notify({ audience: "artist", recipientId: c.artistId, title: `${firstName(c.clientName)} a confirmé le rendez-vous`, body: when, href: "/pro/calendrier" });
          } else {
            notify({ audience: "artist", recipientId: c.artistId, title: `${firstName(c.clientName)} a refusé le créneau`, body: when, href: `/messages/${c.id}` });
          }
        },

        toggleBlock(artistId, date, time) {
          set((s) => {
            const exists = s.blocks.some((b) => b.artistId === artistId && b.date === date && b.time === time);
            return { blocks: exists ? s.blocks.filter((b) => !(b.artistId === artistId && b.date === date && b.time === time)) : [...s.blocks, { artistId, date, time }] };
          });
        },
        addPortfolioItem(item) {
          set((s) => ({ portfolioAdditions: [item, ...s.portfolioAdditions] }));
        },
        removePortfolioItem(id) {
          set((s) => ({ portfolioAdditions: s.portfolioAdditions.filter((p) => p.id !== id) }));
        },
        leaveReview(appointmentId, rating, text) {
          const a = get().appointments.find((x) => x.id === appointmentId);
          if (!a) return;
          const session = get().session;
          const review: LocalReview = {
            id: uid("rv"),
            artistId: a.artistId,
            appointmentId,
            author: session?.name ?? DEMO_CLIENT_NAME,
            rating,
            text: text.trim(),
            date: todayISO(),
          };
          set((s) => ({ reviews: [review, ...s.reviews], appointments: s.appointments.map((x) => (x.id === appointmentId ? { ...x, reviewed: true } : x)) }));
          notify({ audience: "artist", recipientId: a.artistId, title: `${firstName(a.clientName)} vous a laissé un avis ${"★".repeat(rating)}`, body: text.slice(0, 80), href: "/pro" });
        },
        saveArtistProfile(profile) {
          set({ artistProfile: profile });
        },

        markNotificationsRead(role, recipientId) {
          set((s) => ({ notifications: s.notifications.map((n) => (n.audience === role && n.recipientId === recipientId && !n.read ? { ...n, read: true } : n)) }));
        },
        dismissToast() {
          set({ toast: null });
        },
        dismissInstall() {
          set({ installDismissedAt: Date.now() });
        },
        /** « Votre rendez-vous est demain à 14h » (SPEC §25), une seule fois par rendez-vous. */
        ensureReminders() {
          const today = todayISO();
          const tomorrow = addDays(today, 1);
          const { appointments, notifications } = get();
          for (const a of appointments) {
            if (a.status !== "confirmed" || a.date !== tomorrow) continue;
            const key = `reminder-${a.id}`;
            if (notifications.some((n) => n.id.startsWith(key))) continue;
            const n: AppNotification = {
              id: `${key}-client`,
              audience: "client",
              recipientId: a.clientId,
              title: `Votre rendez-vous est demain à ${formatTime(a.time)}.`,
              body: a.artistName,
              href: a.conversationId ? `/messages/${a.conversationId}` : "/",
              at: Date.now(),
              read: false,
            };
            set((s) => ({ notifications: [n, ...s.notifications] }));
          }
        },
        async seedDemo(force = false) {
          if (get().seeded && !force) return;
          const { buildDemoState } = await import("./demo");
          set({ ...emptyData(), ...buildDemoState(), seeded: true, toast: null });
          get().ensureReminders();
        },
        async resetDemo() {
          await get().seedDemo(true);
        },
      };
    },
    {
      name: "fastattoo-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ toast: _toast, ...rest }) => {
        void _toast;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      },
    },
  ),
);

/* ---------- Sélecteurs dérivés (fonctions pures sur l'état) ---------- */

export function upcomingAppointments(appointments: Appointment[], filter: (a: Appointment) => boolean, now = new Date()): Appointment[] {
  const today = todayISO(now);
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return appointments
    .filter((a) => a.status === "confirmed" && filter(a))
    .filter((a) => diffDays(today, a.date) > 0 || (a.date === today && a.time >= hhmm))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function pastAppointments(appointments: Appointment[], filter: (a: Appointment) => boolean): Appointment[] {
  const today = todayISO();
  return appointments.filter((a) => a.status === "confirmed" && filter(a) && diffDays(today, a.date) < 0).sort((a, b) => b.date.localeCompare(a.date));
}
