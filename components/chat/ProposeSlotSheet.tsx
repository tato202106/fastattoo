"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { freeSlots } from "@/lib/calendar";
import { formatTime, relativeDay } from "@/lib/dates";
import { useApp } from "@/lib/store/app";

/** « Proposer un créneau » : créneaux libres du calendrier, durée, envoi en 2 taps. */
export function ProposeSlotSheet({ open, onClose, artistId, conversationId, onSent }: { open: boolean; onClose: () => void; artistId: string; conversationId: string; onSent?: () => void }) {
  const appointments = useApp((s) => s.appointments);
  const blocks = useApp((s) => s.blocks);
  const proposeSlot = useApp((s) => s.proposeSlot);
  const slots = useMemo(() => (open ? freeSlots(artistId, appointments, blocks).slice(0, 18) : []), [open, artistId, appointments, blocks]);
  const [selected, setSelected] = useState<string | null>(null);
  const [duration, setDuration] = useState(2);

  const byDay = slots.reduce<Record<string, string[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s.time);
    return acc;
  }, {});

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Proposer un créneau"
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            const [date, time] = selected.split("_") as [string, string];
            proposeSlot(conversationId, date, time, duration);
            setSelected(null);
            onClose();
            onSent?.();
          }}
        >
          Envoyer la proposition
        </Button>
      }
    >
      <p className="mb-2 text-sm font-semibold">Durée estimée</p>
      <div className="mb-5 flex gap-2">
        {[1, 2, 3, 4].map((h) => (
          <Chip key={h} selected={duration === h} onClick={() => setDuration(h)}>
            {h} h
          </Chip>
        ))}
      </div>
      {Object.keys(byDay).length === 0 && <p className="text-sm text-muted">Aucun créneau libre dans les 3 prochaines semaines.</p>}
      <div className="space-y-4">
        {Object.entries(byDay).map(([date, times]) => (
          <div key={date}>
            <p className="mb-2 text-sm font-semibold first-letter:uppercase">{relativeDay(date)}</p>
            <div className="flex flex-wrap gap-2">
              {times.map((t) => {
                const key = `${date}_${t}`;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected === key}
                    onClick={() => setSelected(key)}
                    className={clsx("tap h-11 rounded-full border px-4 text-sm font-semibold", selected === key ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                  >
                    {formatTime(t)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
