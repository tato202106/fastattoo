"use client";

import { create } from "zustand";
import { roundLatLng } from "../geo";
import type { LatLng } from "../types";

export type GeoStatus = "idle" | "locating" | "granted" | "denied" | "unavailable" | "timeout" | "error";

/**
 * Position de l'utilisateur : en mémoire uniquement (jamais persistée, jamais
 * dans l'URL) et arrondie dès réception (SPEC §9).
 */
interface LocationState {
  position: LatLng | null;
  status: GeoStatus;
  request(): Promise<LatLng | null>;
  clear(): void;
}

export const GEO_MESSAGES: Record<Exclude<GeoStatus, "idle" | "locating" | "granted">, string> = {
  denied: "Position refusée. Tu peux chercher une ville à la place, ou l'autoriser dans les réglages du navigateur.",
  unavailable: "La géolocalisation n'est pas disponible sur cet appareil.",
  timeout: "Ta position met trop de temps à arriver. Réessaie ou cherche une ville.",
  error: "Impossible de récupérer ta position. Réessaie ou cherche une ville.",
};

let pending: Promise<LatLng | null> | null = null;

export const useLocation = create<LocationState>()((set) => ({
  position: null,
  status: "idle",
  request() {
    if (pending) return pending;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      set({ status: "unavailable" });
      return Promise.resolve(null);
    }
    set({ status: "locating" });
    pending = new Promise<LatLng | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = roundLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          set({ position, status: "granted" });
          resolve(position);
        },
        (err) => {
          set({ status: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : err.code === err.POSITION_UNAVAILABLE ? "unavailable" : "error" });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    }).finally(() => {
      pending = null;
    });
    return pending;
  },
  clear() {
    set({ position: null, status: "idle" });
  },
}));

/** La permission a-t-elle déjà été accordée (pour localiser sans redemander) ? */
export async function geolocationAlreadyGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    return status?.state === "granted";
  } catch {
    return false;
  }
}
