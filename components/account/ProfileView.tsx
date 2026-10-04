"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InstallRow } from "@/components/pwa/InstallPrompt";
import { InitialsAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { formatShortDay, formatTime, relativeDay } from "@/lib/dates";
import { requestPushPermission } from "@/lib/notifications/channels";
import { pastAppointments, upcomingAppointments, useApp } from "@/lib/store/app";
import { DEMO_ARTIST_SLUG } from "@/lib/store/ids";
import type { Appointment } from "@/lib/store/model";

function Row({ icon, label, href, onClick, hint }: { icon: IconName; label: string; href?: string; onClick?: () => void; hint?: string }) {
  const inner = (
    <>
      <Icon name={icon} size={22} />
      <span className="flex-1 font-medium">{label}</span>
      {hint && <span className="text-sm text-muted">{hint}</span>}
      <Icon name="chevronRight" size={18} className="text-muted" />
    </>
  );
  const cls = "tap flex min-h-14 w-full items-center gap-3 px-4 text-left";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function ProfileView() {
  const router = useRouter();
  const session = useApp((s) => s.session)!;
  const appointments = useApp((s) => s.appointments);
  const logout = useApp((s) => s.logout);
  const resetDemo = useApp((s) => s.resetDemo);
  const [push, setPush] = useState<string>(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  const [reviewFor, setReviewFor] = useState<Appointment | null>(null);
  const isArtist = session.role === "artist";
  const mine = (a: Appointment) => (isArtist ? a.artistId === session.userId : a.clientId === session.userId);
  const upcoming = upcomingAppointments(appointments, mine);
  const past = pastAppointments(appointments, mine);

  return (
    <div className="space-y-6 px-4 lg:px-0">
      <div className="flex items-center gap-4">
        <InitialsAvatar name={session.name} size={64} />
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold">{session.name}</p>
          <p className="truncate text-sm text-muted">{session.email || (isArtist ? "Compte tatoueur·se" : "Compte client")}</p>
        </div>
      </div>

      {!isArtist && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Mes rendez-vous</h2>
          {upcoming.length === 0 && past.length === 0 && <p className="text-sm text-muted">Aucun rendez-vous pour l&apos;instant.</p>}
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Link href={a.conversationId ? `/messages/${a.conversationId}` : "/messages"} className="tap flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card">
                  <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-accent-soft py-1.5 text-accent">
                    <span className="text-[11px] font-semibold uppercase">{formatShortDay(a.date).split(" ")[0]}</span>
                    <span className="text-lg font-bold">{a.date.slice(8)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.artistName}</span>
                    <span className="block truncate text-sm text-muted">
                      {relativeDay(a.date)} · {formatTime(a.time)} · {a.label}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {past.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.artistName}</span>
                  <span className="block truncate text-sm text-muted">
                    {formatShortDay(a.date)} · {a.label}
                  </span>
                </span>
                {a.reviewed ? (
                  <span className="text-sm font-medium text-success">Avis envoyé ✓</span>
                ) : (
                  <Button size="sm" onClick={() => setReviewFor(a)}>
                    Laisser un avis
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="divide-y divide-border overflow-hidden rounded-2xl bg-surface shadow-card">
        {isArtist ? (
          <>
            <Row icon="grid" label="Mon dashboard" href="/pro" />
            <Row icon="image" label="Mon portfolio" href="/pro/portfolio" />
            <Row icon="edit" label="Profil professionnel" href="/pro/onboarding" />
            <Row icon="user" label="Voir mon profil public" href={`/tatoueurs/${DEMO_ARTIST_SLUG}`} />
          </>
        ) : (
          <>
            <Row icon="heart" label="Mes favoris" href="/favoris" />
            <Row icon="message" label="Mes demandes et messages" href="/messages" />
          </>
        )}
        <Row icon="bell" label="Notifications" href="/notifications" />
        <Row
          icon="sparkle"
          label="Notifications push"
          hint={push === "granted" ? "Activées" : push === "denied" ? "Bloquées" : push === "unsupported" ? "Non dispo" : "Activer"}
          onClick={async () => setPush(await requestPushPermission())}
        />
        <InstallRow />
      </section>

      <section className="divide-y divide-border overflow-hidden rounded-2xl bg-surface shadow-card">
        <Row
          icon="refresh"
          label={isArtist ? "Passer en mode client" : "Passer en mode tatoueur·se"}
          onClick={() => {
            logout();
            router.push(isArtist ? "/connexion" : "/connexion?role=artist");
          }}
        />
        <Row
          icon="trash"
          label="Réinitialiser la démo"
          onClick={() => {
            if (confirm("Remettre les données de démo à zéro ?")) void resetDemo();
          }}
        />
        <Row
          icon="logout"
          label="Se déconnecter"
          onClick={() => {
            logout();
            router.push("/");
          }}
        />
      </section>
      <ReviewSheet appointment={reviewFor} onClose={() => setReviewFor(null)} />
    </div>
  );
}

/** Avis après rendez-vous (Phase 5). */
export function ReviewSheet({ appointment, onClose }: { appointment: Appointment | null; onClose: () => void }) {
  const leaveReview = useApp((s) => s.leaveReview);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  return (
    <Sheet
      open={appointment != null}
      onClose={onClose}
      title={`Ton avis sur ${appointment?.artistName ?? ""}`}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={text.trim().length < 10}
          onClick={() => {
            if (appointment) leaveReview(appointment.id, rating, text);
            setText("");
            onClose();
          }}
        >
          Publier mon avis
        </Button>
      }
    >
      <div className="flex justify-center gap-1 py-2" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="tap inline-flex size-12 items-center justify-center">
            <Icon name="star" size={36} strokeWidth={1.5} className={n <= rating ? "text-star" : "text-border"} />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Accueil, conseils, résultat, cicatrisation…"
        className="w-full resize-none rounded-2xl border border-border bg-surface p-3 outline-none focus:border-fg"
      />
    </Sheet>
  );
}
