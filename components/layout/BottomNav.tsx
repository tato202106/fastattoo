"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import { hidesBottomNav, isActive, navFor } from "./nav-items";
import { useNavBadges } from "./useNavBadges";

/** Navigation basse fixe, au pouce (SPEC §4). Masquée sur desktop (lg). */
export function BottomNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const role = useApp((s) => s.session?.role);
  const badges = useNavBadges();
  if (hidesBottomNav(pathname)) return null;
  const items = navFor(hydrated ? role : undefined);

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex h-[var(--nav-h)] max-w-xl items-stretch justify-around px-1">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "tap flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <span className="relative">
                  <Icon name={item.icon} size={24} strokeWidth={active ? 2.3 : 1.8} filled={active && item.icon === "heart"} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] rounded-full bg-accent px-1 text-center text-[10px] leading-[18px] font-bold text-accent-fg">
                      {count > 9 ? "9+" : count}
                      <span className="sr-only"> non lus</span>
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
