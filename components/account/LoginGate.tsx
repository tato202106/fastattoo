"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import type { Role } from "@/lib/store/model";

/** Affiche le contenu si l'utilisateur est connecté (et a le bon rôle), sinon une invitation courte. */
export function LoginGate({ children, role, icon = "user", title, text }: { children: ReactNode; role?: Role; icon?: IconName; title: string; text: string }) {
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  if (!hydrated) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (session && (!role || session.role === role)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center px-6 pt-16 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={30} />
      </span>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-xs text-muted">{text}</p>
      <Link href={`/connexion${role === "artist" ? "?role=artist" : ""}`} className={buttonClass("primary", "lg", "mt-6 w-full max-w-xs")}>
        {session && role && session.role !== role ? "Changer de compte" : "Se connecter"}
      </Link>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-end justify-between gap-3 bg-bg/95 px-4 pt-[calc(var(--safe-top)+14px)] pb-3 backdrop-blur-md lg:static lg:px-0 lg:pt-8">
      <h1 className="font-display text-[30px] leading-none font-bold">{title}</h1>
      {action}
    </header>
  );
}
