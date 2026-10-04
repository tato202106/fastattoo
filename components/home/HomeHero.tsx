"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

/** Titre de la homepage. Un client connecté voit son espace à la place (ClientDashboard). */
export function HomeHero() {
  const hydrated = useHydrated();
  const role = useApp((s) => s.session?.role);
  if (hydrated && role === "client") return <h2 className="text-xl font-semibold">Trouve ton prochain tatoueur</h2>;
  return (
    <div>
      {hydrated && role === "artist" && (
        <Link href="/pro" className="tap mb-4 flex min-h-12 items-center gap-2 rounded-2xl bg-accent-soft px-4 text-sm font-semibold text-accent">
          <Icon name="grid" size={18} /> Aller à mon dashboard tatoueur
          <Icon name="chevronRight" size={16} className="ml-auto" />
        </Link>
      )}
      <h1 className="font-display text-[34px] leading-[1.05] font-bold tracking-tight sm:text-[40px] lg:text-5xl">Trouve ton tatoueur.</h1>
      <p className="mt-2 text-[17px] text-muted">Les meilleurs artistes autour de toi.</p>
    </div>
  );
}
