"use client";

import { useState } from "react";
import { InitialsAvatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Rating";
import { formatShortDay } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import { styleLabel } from "@/lib/styles";
import type { Review } from "@/lib/types";

export function ReviewsList({ artistId, reviews }: { artistId: string; reviews: Review[] }) {
  const hydrated = useHydrated();
  const local = useApp((s) => s.reviews);
  const [expanded, setExpanded] = useState(false);
  const all = [...(hydrated ? local.filter((r) => r.artistId === artistId) : []), ...reviews];
  const shown = expanded ? all : all.slice(0, 3);
  return (
    <div>
      <ul className="space-y-4">
        {shown.map((r) => (
          <li key={r.id} className="rounded-2xl bg-surface p-4 shadow-card">
            <div className="flex items-center gap-3">
              <InitialsAvatar name={r.author} size={36} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.author}</p>
                <p className="text-xs text-muted">
                  {formatShortDay(r.date)}
                  {r.style ? ` · ${styleLabel(r.style)}` : ""}
                </p>
              </div>
              <Stars value={r.rating} />
            </div>
            <p className="mt-2 text-[15px] leading-relaxed">{r.text}</p>
          </li>
        ))}
      </ul>
      {all.length > 3 && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="tap mt-3 h-11 w-full rounded-full border border-border text-sm font-semibold">
          {expanded ? "Voir moins" : `Voir les ${all.length} avis`}
        </button>
      )}
    </div>
  );
}
