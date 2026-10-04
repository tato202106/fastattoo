"use client";

import { useSyncExternalStore } from "react";
import { useApp } from "./app";

const subscribe = (cb: () => void) => useApp.persist.onFinishHydration(cb);

/**
 * true une fois l'état local chargé ET les données de démo prêtes (évite les
 * écarts serveur/client à l'hydratation et les écrans vides transitoires).
 */
export function useHydrated(): boolean {
  const rehydrated = useSyncExternalStore(subscribe, () => useApp.persist.hasHydrated(), () => false);
  const seeded = useApp((s) => s.seeded);
  return rehydrated && seeded;
}
