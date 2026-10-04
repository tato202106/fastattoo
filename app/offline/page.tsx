import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Hors ligne" };

/** Page de repli du service worker quand une page n'est pas en cache. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-surface-2">
        <Icon name="wifiOff" size={30} />
      </span>
      <h1 className="mt-4 text-xl font-semibold">Pas de connexion</h1>
      <p className="mt-1 max-w-xs text-muted">Les pages déjà consultées restent disponibles. Réessaie dès que le réseau revient.</p>
      <Link href="/" className="tap mt-6 inline-flex h-12 items-center rounded-full bg-fg px-6 font-semibold text-bg">
        Réessayer
      </Link>
    </main>
  );
}
