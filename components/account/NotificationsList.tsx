"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { timeAgo } from "@/lib/dates";
import { useApp } from "@/lib/store/app";

/** Notifications in-app (SPEC §25). Marquées comme lues à l'ouverture. */
export function NotificationsList() {
  const session = useApp((s) => s.session)!;
  const all = useApp((s) => s.notifications);
  const markRead = useApp((s) => s.markNotificationsRead);
  const items = useMemo(() => all.filter((n) => n.audience === session.role && n.recipientId === session.userId).sort((a, b) => b.at - a.at), [all, session]);
  const unreadIds = useMemo(() => new Set(items.filter((n) => !n.read).map((n) => n.id)), [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => markRead(session.role, session.userId), 800);
    return () => clearTimeout(t);
  }, [markRead, session]);

  if (items.length === 0) return <p className="px-4 py-12 text-center text-muted">Rien de nouveau pour l&apos;instant.</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((n) => (
        <li key={n.id}>
          <Link href={n.href} className={clsx("tap flex items-start gap-3 px-4 py-3.5", unreadIds.has(n.id) && "bg-accent-soft/50")}>
            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
              <Icon name="bell" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={clsx("block", unreadIds.has(n.id) ? "font-semibold" : "font-medium")}>{n.title}</span>
              {n.body && <span className="block truncate text-sm text-muted">{n.body}</span>}
              <span className="mt-0.5 block text-xs text-muted">{timeAgo(n.at)}</span>
            </span>
            {unreadIds.has(n.id) && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-accent" aria-label="Non lue" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
