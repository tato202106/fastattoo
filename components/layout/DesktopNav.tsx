"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import { Logo } from "./Logo";
import { isActive, navFor } from "./nav-items";
import { useNavBadges } from "./useNavBadges";

/** Barre de navigation desktop (adaptation secondaire de la navigation mobile). */
export function DesktopNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const role = useApp((s) => s.session?.role);
  const badges = useNavBadges();
  const items = navFor(hydrated ? role : undefined);
  return (
    <header className="sticky top-0 z-40 hidden h-16 border-b border-border bg-surface/95 backdrop-blur-md lg:block">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-8 px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="flex flex-1 items-center gap-1">
          {items.map((item) => {
            const active = isActive(item, pathname);
            const count = item.badge ? badges[item.badge] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx("flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium", active ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg")}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
                {count > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">{count}</span>}
              </Link>
            );
          })}
        </nav>
        <Link href="/notifications" aria-label="Notifications" className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2">
          <Icon name="bell" size={20} />
          {badges.notifications > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-accent" />}
        </Link>
      </div>
    </header>
  );
}
