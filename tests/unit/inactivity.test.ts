import { describe, expect, it } from "vitest";
import {
  activeLinkSecret,
  activeLinkToken,
  inactivityNoticeEmail,
  inactivityStep,
  INACTIVE_AFTER_DAYS,
  PAUSE_AFTER_NOTICE_DAYS,
  resumesOnActivity,
  verifyActiveLinkToken,
} from "@/lib/accounts/inactivity";
import { autoPublishDecision } from "@/lib/accounts/profile";

const now = new Date("2026-11-16T09:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const base = { status: "published" as const, paid: true, createdAt: daysAgo(400), lastActiveAt: daysAgo(3), inactivityNoticeAt: null };

describe("tatoueurs inactifs", () => {
  it("actif récemment : rien", () => {
    expect(inactivityStep(base, now)).toBe("none");
  });

  it(`pas de connexion depuis ${INACTIVE_AFTER_DAYS} jours : e-mail « Tu tatoues toujours ? »`, () => {
    expect(inactivityStep({ ...base, lastActiveAt: daysAgo(INACTIVE_AFTER_DAYS) }, now)).toBe("notice");
    expect(inactivityStep({ ...base, lastActiveAt: daysAgo(INACTIVE_AFTER_DAYS - 1) }, now)).toBe("none");
  });

  it("jamais connecté : compte à partir de la création du compte", () => {
    expect(inactivityStep({ ...base, lastActiveAt: null, createdAt: daysAgo(10) }, now)).toBe("none");
    expect(inactivityStep({ ...base, lastActiveAt: null, createdAt: daysAgo(60) }, now)).toBe("notice");
  });

  it(`e-mail envoyé : on attend ${PAUSE_AFTER_NOTICE_DAYS} jours, puis pause`, () => {
    const old = { ...base, lastActiveAt: daysAgo(70) };
    expect(inactivityStep({ ...old, inactivityNoticeAt: daysAgo(5) }, now)).toBe("none");
    expect(inactivityStep({ ...old, inactivityNoticeAt: daysAgo(PAUSE_AFTER_NOTICE_DAYS) }, now)).toBe("pause");
  });

  it("revenu après l'e-mail : le compteur repart", () => {
    expect(inactivityStep({ ...base, lastActiveAt: daysAgo(2), inactivityNoticeAt: daysAgo(20) }, now)).toBe("none");
  });

  it("profil hors ligne ou sans abonnement : jamais d'e-mail", () => {
    expect(inactivityStep({ ...base, lastActiveAt: daysAgo(200), status: "paused" }, now)).toBe("none");
    expect(inactivityStep({ ...base, lastActiveAt: daysAgo(200), paid: false }, now)).toBe("none");
  });

  it("une connexion ne relance que la pause décidée faute d'activité", () => {
    expect(resumesOnActivity({ status: "paused", pausedReason: "inactivity" })).toBe(true);
    expect(resumesOnActivity({ status: "paused", pausedReason: "owner" })).toBe(false);
    expect(resumesOnActivity({ status: "published", pausedReason: null })).toBe(false);
  });

  it("un profil en pause n'est pas republié automatiquement", () => {
    expect(autoPublishDecision({ status: "paused", paid: true, lat: 47.2, lng: -1.5 })).toBe("skip");
  });

  it("l'e-mail propose les trois choix", () => {
    const { text } = inactivityNoticeEmail("Léa", { active: "https://x/actif", space: "https://x/espace" });
    expect(text).toContain("https://x/actif");
    expect(text).toMatch(/pause/);
    expect(text).toMatch(/résilie/);
  });
});

describe("lien « Je suis toujours actif »", () => {
  const secret = "s3cret";
  it("aller-retour", () => {
    const t = activeLinkToken(secret, 42, now.getTime());
    expect(verifyActiveLinkToken(secret, t, now.getTime())).toBe(42);
  });

  it("refuse un jeton modifié, expiré ou signé avec un autre secret", () => {
    const t = activeLinkToken(secret, 42, now.getTime());
    expect(verifyActiveLinkToken(secret, t.replace(/^42/, "43"), now.getTime())).toBeNull();
    expect(verifyActiveLinkToken("autre", t, now.getTime())).toBeNull();
    expect(verifyActiveLinkToken(secret, t, now.getTime() + 31 * 86_400_000)).toBeNull();
    expect(verifyActiveLinkToken(secret, "n'importe quoi", now.getTime())).toBeNull();
    expect(verifyActiveLinkToken(undefined, t, now.getTime())).toBeNull();
  });

  it("secret : ACTIVITY_LINK_SECRET, sinon CRON_SECRET", () => {
    expect(activeLinkSecret({ ACTIVITY_LINK_SECRET: "a", CRON_SECRET: "b" })).toBe("a");
    expect(activeLinkSecret({ CRON_SECRET: "b" })).toBe("b");
    expect(activeLinkSecret({})).toBeUndefined();
  });
});
