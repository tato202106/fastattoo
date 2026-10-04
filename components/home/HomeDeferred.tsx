"use client";

import dynamic from "next/dynamic";

/**
 * Blocs de l'accueil qui n'existent qu'après hydratation (espace client
 * connecté, invite d'installation) : chargés à part pour alléger le bundle initial.
 */
export const ClientDashboard = dynamic(() => import("@/components/client/ClientDashboard").then((m) => m.ClientDashboard), { ssr: false });
export const InstallBanner = dynamic(() => import("@/components/pwa/InstallPrompt").then((m) => m.InstallBanner), { ssr: false });
