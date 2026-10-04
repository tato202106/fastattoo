"use client";

import { useMemo } from "react";
import { todayISO } from "@/lib/dates";
import { upcomingAppointments, useApp } from "@/lib/store/app";

/** Données de l'espace tatoueur dérivées du store (pour l'artiste connecté). */
export function useArtistData() {
  const session = useApp((s) => s.session);
  const requests = useApp((s) => s.requests);
  const conversations = useApp((s) => s.conversations);
  const appointments = useApp((s) => s.appointments);
  const artistId = session?.role === "artist" ? session.userId : "";
  return useMemo(() => {
    const today = todayISO();
    const myRequests = requests.filter((r) => r.artistId === artistId).sort((a, b) => b.createdAt - a.createdAt);
    const myConvs = conversations.filter((c) => c.artistId === artistId);
    return {
      artistId,
      name: session?.name ?? "",
      requests: myRequests,
      newRequests: myRequests.filter((r) => r.status === "new"),
      unreadMessages: myConvs.reduce((n, c) => n + c.unread.artist, 0),
      todayAppointments: appointments.filter((a) => a.artistId === artistId && a.date === today && a.status === "confirmed").sort((a, b) => a.time.localeCompare(b.time)),
      next: upcomingAppointments(appointments, (a) => a.artistId === artistId)[0],
      appointments: appointments.filter((a) => a.artistId === artistId),
    };
  }, [artistId, session, requests, conversations, appointments]);
}
