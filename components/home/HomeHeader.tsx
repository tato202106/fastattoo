"use client";

import Link from "next/link";
import { useNavBadges } from "@/components/layout/useNavBadges";
import { Logo } from "@/components/layout/Logo";
import { InitialsAvatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

export function HomeHeader() {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const { notifications } = useNavBadges();
  return (
    <header className="flex h-14 items-center justify-between lg:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        {hydrated && session && (
          <Link href="/notifications" aria-label={`Notifications${notifications ? ` (${notifications} non lues)` : ""}`} className="tap relative inline-flex size-11 items-center justify-center rounded-full">
            <Icon name="bell" size={22} />
            {notifications > 0 && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-accent ring-2 ring-bg" />}
          </Link>
        )}
        {hydrated && session ? (
          <Link href="/profil" aria-label="Mon profil" className="tap inline-flex size-11 items-center justify-center">
            <InitialsAvatar name={session.name} size={36} />
          </Link>
        ) : (
          <Link href="/connexion" className="tap inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold">
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
