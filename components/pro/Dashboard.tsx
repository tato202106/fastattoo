"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatTime, relativeDay } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { styleLabel, zoneLabel } from "@/lib/styles";
import { useArtistData } from "./useArtistData";

function Shortcut({ href, icon, label, count }: { href: string; icon: IconName; label: string; count?: number }) {
  return (
    <Link href={href} className="tap relative flex h-28 flex-col justify-between rounded-2xl bg-surface p-4 shadow-card">
      <Icon name={icon} size={24} />
      <span className="flex items-end justify-between">
        <span className="font-semibold">{label}</span>
        {count != null && count > 0 && <span className="text-3xl leading-none font-bold text-accent">{count}</span>}
      </span>
    </Link>
  );
}

/** Dashboard tatoueur (SPEC §19–20) : l'essentiel entre deux rendez-vous. */
export function Dashboard() {
  const d = useArtistData();
  const additions = useApp((s) => s.portfolioAdditions.filter((p) => p.artistId === d.artistId).length);
  const firstName = d.name.split(" ")[0];

  // Statistiques simples. ⚠️ Vues et taux de réponse : valeurs de démonstration
  // (aucun suivi d'audience n'existe encore côté serveur).
  const [now] = useState(() => Date.now());
  const monthRequests = d.requests.filter((r) => now - r.createdAt < 30 * 86_400_000).length;
  const answered = d.requests.filter((r) => r.status !== "new").length;
  const responseRate = d.requests.length ? Math.round((answered / d.requests.length) * 100) : 0;

  return (
    <div className="space-y-6 px-4 lg:px-0">
      <h1 className="font-display pt-[calc(var(--safe-top)+14px)] text-[30px] leading-tight font-bold lg:pt-8">Bonjour {firstName} 👋</h1>

      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-fg p-4 text-bg">
        <div>
          <p className="text-xs opacity-70">Aujourd&apos;hui</p>
          <p className="text-2xl font-bold">{d.todayAppointments.length}</p>
          <p className="text-xs opacity-70">rendez-vous</p>
        </div>
        <div>
          <p className="text-xs opacity-70">Nouvelles</p>
          <p className="text-2xl font-bold">{d.newRequests.length}</p>
          <p className="text-xs opacity-70">demandes</p>
        </div>
        <div>
          <p className="text-xs opacity-70">Messages</p>
          <p className="text-2xl font-bold">{d.unreadMessages}</p>
          <p className="text-xs opacity-70">non lus</p>
        </div>
      </div>

      {d.next && (
        <Link href="/pro/calendrier" className="tap flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
          <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Icon name="clock" size={18} />
            <span className="text-sm font-bold">{d.next.time}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wide text-muted uppercase">Prochain rendez-vous</span>
            <span className="block truncate text-lg font-semibold">
              {formatTime(d.next.time)} · {d.next.clientName}
            </span>
            <span className="block truncate text-sm text-muted">
              {relativeDay(d.next.date)} · {d.next.label}
            </span>
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Shortcut href="/pro/demandes" icon="inbox" label="Demandes" count={d.newRequests.length} />
        <Shortcut href="/pro/calendrier" icon="calendar" label="Calendrier" />
        <Shortcut href="/pro/portfolio" icon="image" label="Portfolio" count={additions || undefined} />
        <Shortcut href="/messages" icon="message" label="Messages" count={d.unreadMessages} />
      </div>

      <Link href="/pro/portfolio/ajouter" className="tap flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-fg">
        <Icon name="plus" size={22} /> Ajouter un tatouage
      </Link>

      {d.newRequests.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nouvelles demandes</h2>
            <Link href="/pro/demandes" className="text-sm font-medium text-muted">
              Tout voir
            </Link>
          </div>
          <ul className="space-y-2">
            {d.newRequests.slice(0, 3).map((r) => (
              <li key={r.id}>
                <Link href={`/pro/demandes/${r.id}`} className="tap flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{r.clientName}</span>
                    <span className="block truncate text-sm text-muted">
                      {r.styles.map(styleLabel).join(", ")} · {zoneLabel(r.zone)} · {r.budgetMin}–{r.budgetMax} €
                    </span>
                  </span>
                  <Icon name="chevronRight" size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="stats">
        <h2 id="stats" className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Icon name="chart" size={20} /> Statistiques
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Vues du profil", "1 284", "30 j · démo"],
            ["Demandes", String(monthRequests), "30 derniers jours"],
            ["Taux de réponse", `${responseRate} %`, "demandes traitées"],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-2xl bg-surface p-3 shadow-card">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-xl font-bold">{value}</p>
              <p className="text-[11px] text-muted">{hint}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
