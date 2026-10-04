"use client";

import { useSyncExternalStore } from "react";
import { useApp } from "./app";

const subscribe = (cb: () => void) => useApp.persist.onFinishHydration(cb);

/** true une fois l'état local chargé (évite les écarts serveur/client à l'hydratation). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => useApp.persist.hasHydrated(), () => false);
}
