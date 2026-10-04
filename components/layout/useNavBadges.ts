"use client";

import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

export function useNavBadges() {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const conversations = useApp((s) => s.conversations);
  const requests = useApp((s) => s.requests);
  const notifications = useApp((s) => s.notifications);
  if (!hydrated || !session) return { messages: 0, requests: 0, notifications: 0 };
  const isArtist = session.role === "artist";
  const mine = conversations.filter((c) => (isArtist ? c.artistId === session.userId : c.clientId === session.userId));
  return {
    messages: mine.reduce((n, c) => n + (isArtist ? c.unread.artist : c.unread.client), 0),
    requests: isArtist ? requests.filter((r) => r.artistId === session.userId && r.status === "new").length : 0,
    notifications: notifications.filter((n) => n.audience === session.role && n.recipientId === session.userId && !n.read).length,
  };
}
