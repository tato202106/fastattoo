"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function PublishedToast() {
  const params = useSearchParams();
  const [open, setOpen] = useState(params.has("publie"));
  if (!open) return null;
  const s = Number(params.get("publie"));
  return (
    <div role="status" className="mx-4 mt-[calc(var(--safe-top)+10px)] flex items-center gap-3 rounded-2xl bg-success/12 p-3 text-sm lg:mx-0">
      <span className="text-xl">✨</span>
      <p className="flex-1">
        <strong>Publié !</strong> {Number.isFinite(s) && s > 0 ? `En ${s} secondes.` : ""} Ton tatouage apparaît en tête de ton portfolio.
      </p>
      <button type="button" onClick={() => setOpen(false)} className="px-2 font-semibold">
        OK
      </button>
    </div>
  );
}
