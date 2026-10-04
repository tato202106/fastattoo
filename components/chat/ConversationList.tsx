"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { Avatar, InitialsAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { timeAgo } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import type { Message } from "@/lib/store/model";

function preview(m: Message | undefined, side: "client" | "artist"): string {
  if (!m) return "";
  const prefix = m.from === side ? "Vous : " : "";
  switch (m.kind) {
    case "text":
      return prefix + m.text;
    case "photo":
      return `${prefix}📷 Photo`;
    case "reference":
      return `${prefix}🔗 Référence`;
    case "price":
      return `${prefix}Devis : ${m.amount} €`;
    case "proposal":
      return `${prefix}📅 Proposition de rendez-vous`;
    case "request":
      return `${prefix}Demande de projet`;
  }
}

export function ConversationList() {
  const session = useApp((s) => s.session)!;
  const conversations = useApp((s) => s.conversations);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const side = session.role === "artist" ? "artist" : "client";
  const mine = conversations
    .filter((c) => (side === "artist" ? c.artistId === session.userId : c.clientId === session.userId))
    .filter((c) => filter === "all" || c.unread[side] > 0)
    .sort((a, b) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0));

  return (
    <div>
      <div className="flex gap-2 px-4 pb-2 lg:px-0">
        <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
          Tous
        </Chip>
        <Chip selected={filter === "unread"} onClick={() => setFilter("unread")}>
          Non lus
        </Chip>
      </div>
      {mine.length === 0 && <p className="px-4 py-10 text-center text-muted">Aucune conversation pour l&apos;instant.</p>}
      <ul>
        {mine.map((c) => {
          const last = c.messages.at(-1);
          const unread = c.unread[side];
          const name = side === "artist" ? c.clientName : c.artistName;
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="tap flex items-center gap-3 px-4 py-3 active:bg-surface-2 lg:rounded-2xl lg:px-2">
                {side === "artist" ? <InitialsAvatar name={name} size={52} /> : <Avatar image={c.artistAvatar} size={52} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={clsx("truncate", unread ? "font-bold" : "font-semibold")}>{name}</p>
                    {last && <span className={clsx("shrink-0 text-xs", unread ? "font-semibold text-accent" : "text-muted")}>{timeAgo(last.at)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={clsx("flex-1 truncate text-sm", unread ? "text-fg" : "text-muted")}>{preview(last, side)}</p>
                    {unread > 0 && <span className="min-w-5 rounded-full bg-accent px-1.5 text-center text-[11px] leading-5 font-bold text-accent-fg">{unread}</span>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
