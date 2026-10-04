import type { Metadata } from "next";
import { Suspense } from "react";
import { Explorer } from "@/components/explore/Explorer";

export const metadata: Metadata = {
  title: "Explorer la carte",
  description: "Les tatoueurs autour de toi sur la carte : filtre par style, distance, prix et disponibilité.",
};

export default function ExplorerPage() {
  return (
    <main>
      <Suspense fallback={<div className="skeleton fixed inset-0" aria-label="Chargement" />}>
        <Explorer />
      </Suspense>
    </main>
  );
}
