"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/account/LoginGate";
import { InitialsAvatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { Picture } from "@/components/ui/Picture";
import { timeAgo } from "@/lib/dates";
import { requestStatusFor } from "@/lib/store/labels";
import { styleLabel, zoneLabel } from "@/lib/styles";
import { useArtistData } from "./useArtistData";

const TABS = [
  { value: "new", label: "Nouvelles" },
  { value: "active", label: "En cours" },
  { value: "done", label: "Archivées" },
] as const;

/** Demandes (SPEC §22) : carte compacte → « Voir ». */
export function RequestsInbox() {
  const { requests } = useArtistData();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("new");
  const shown = requests.filter((r) => (tab === "new" ? r.status === "new" : tab === "active" ? r.status === "accepted" || r.status === "proposed" : r.status === "booked" || r.status === "declined"));

  return (
    <>
      <PageHeader title="Demandes" />
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3 lg:px-0">
        {TABS.map((t) => {
          const n = requests.filter((r) => (t.value === "new" ? r.status === "new" : t.value === "active" ? r.status === "accepted" || r.status === "proposed" : r.status === "booked" || r.status === "declined")).length;
          return (
            <Chip key={t.value} selected={tab === t.value} onClick={() => setTab(t.value)}>
              {t.label} <span className="opacity-60">{n}</span>
            </Chip>
          );
        })}
      </div>
      {shown.length === 0 && <p className="px-4 py-10 text-center text-muted">Aucune demande ici.</p>}
      <ul className="space-y-3 px-4 lg:px-0">
        {shown.map((r) => {
          const status = requestStatusFor(r.status, "artist");
          return (
            <li key={r.id}>
              <Link href={`/pro/demandes/${r.id}`} className="tap block rounded-2xl bg-surface p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={r.clientName} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.clientName}</p>
                    <p className="text-xs text-muted">{timeAgo(r.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                </div>
                <p className="mt-3 font-medium">{r.styles.map(styleLabel).join(" · ")}</p>
                <p className="text-sm text-muted">{zoneLabel(r.zone)}</p>
                <p className="mt-1 text-sm">
                  Budget : <strong>{r.budgetMin}–{r.budgetMax} €</strong>
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-fg/80">{r.description}</p>
                {r.inspirations.length > 0 && (
                  <div className="mt-3 flex gap-1.5">
                    {r.inspirations.slice(0, 4).map((img) => (
                      <div key={img.id} className="relative size-14 overflow-hidden rounded-lg">
                        <Picture image={img} usage="list" fill sizes="56px" />
                      </div>
                    ))}
                  </div>
                )}
                <span className="mt-3 flex h-11 items-center justify-center rounded-full bg-fg text-sm font-semibold text-bg">Voir</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
