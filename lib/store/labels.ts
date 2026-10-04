import type { RequestStatus } from "./model";

export const REQUEST_STATUS: Record<RequestStatus, { label: string; className: string }> = {
  new: { label: "Nouvelle", className: "bg-accent text-accent-fg" },
  accepted: { label: "Acceptée", className: "bg-accent-soft text-accent" },
  proposed: { label: "Créneau proposé", className: "bg-warning/15 text-warning" },
  booked: { label: "Rendez-vous pris", className: "bg-success/15 text-success" },
  declined: { label: "Refusée", className: "bg-surface-2 text-muted" },
};

/** Libellé côté client (« Envoyée » plutôt que « Nouvelle »). */
export function requestStatusFor(status: RequestStatus, side: "client" | "artist") {
  if (side === "client" && status === "new") return { label: "Envoyée", className: "bg-surface-2 text-fg" };
  return REQUEST_STATUS[status];
}
