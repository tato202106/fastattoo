import { describe, expect, it } from "vitest";
import {
  newReviewEmail,
  parseReply,
  parseReview,
  publicAuthorName,
  REVIEW_LINK_DAYS,
  reviewLinkToken,
  reviewRequestEmail,
  reviewRequestWindow,
  siteReviewId,
  summarizeRatings,
  verifyReviewLinkToken,
} from "@/lib/reviews";
import { activeLinkToken } from "@/lib/accounts/inactivity";

const now = Date.parse("2026-11-16T17:00:00Z");
const DAY = 86_400_000;

describe("lien personnel de demande d'avis", () => {
  const secret = "s3cret";

  it("aller-retour", () => {
    expect(verifyReviewLinkToken(secret, reviewLinkToken(secret, 7, now), now)).toBe(7);
  });

  it(`valable ${REVIEW_LINK_DAYS} jours`, () => {
    const t = reviewLinkToken(secret, 7, now);
    expect(verifyReviewLinkToken(secret, t, now + (REVIEW_LINK_DAYS - 1) * DAY)).toBe(7);
    expect(verifyReviewLinkToken(secret, t, now + (REVIEW_LINK_DAYS + 1) * DAY)).toBeNull();
  });

  it("refuse un autre rendez-vous, un autre secret ou un jeton bricolé", () => {
    const t = reviewLinkToken(secret, 7, now);
    expect(verifyReviewLinkToken(secret, t.replace(/^7/, "8"), now)).toBeNull();
    expect(verifyReviewLinkToken("autre", t, now)).toBeNull();
    expect(verifyReviewLinkToken(secret, "7.9999999999999.abc", now)).toBeNull();
    expect(verifyReviewLinkToken(undefined, t, now)).toBeNull();
  });

  it("un lien « toujours actif » ne sert pas de lien d'avis", () => {
    expect(verifyReviewLinkToken(secret, activeLinkToken(secret, 7, now), now)).toBeNull();
  });
});

describe("demandes d'avis", () => {
  it("rendez-vous de la semaine passée, jusqu'à hier", () => {
    expect(reviewRequestWindow("2026-11-16")).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  });

  it("e-mail au client avec le lien", () => {
    const { subject, text } = reviewRequestEmail("Marie", { name: "Léa Ink", studio: "Atelier Nord" }, "https://x/avis?t=1");
    expect(subject).toContain("Léa Ink");
    expect(text).toContain("https://x/avis?t=1");
    expect(text).toContain("Bonjour Marie,");
  });

  it("e-mail au tatoueur à chaque nouvel avis", () => {
    const { subject, text } = newReviewEmail("Léa", { rating: 4, text: "Top", author: "Marie D." }, "https://x/espace-tatoueur#avis");
    expect(subject).toContain("★★★★☆");
    expect(text).toContain("« Top »");
  });
});

describe("formulaire d'avis", () => {
  it("nom affiché : prénom + initiale du nom", () => {
    expect(publicAuthorName("Marie Dupont")).toBe("Marie D.");
    expect(publicAuthorName("  jean  claude martin ")).toBe("jean M.");
    expect(publicAuthorName("Zoé")).toBe("Zoé");
    expect(publicAuthorName("")).toBe("Client");
  });

  it("note de 1 à 5 obligatoire, commentaire facultatif", () => {
    expect(parseReview({ rating: 5, text: "", author: "Marie D." })).toEqual({ ok: true, value: { rating: 5, text: "", author: "Marie D." } });
    expect(parseReview({ rating: 0, author: "Marie" }).ok).toBe(false);
    expect(parseReview({ rating: 6, author: "Marie" }).ok).toBe(false);
    expect(parseReview({ rating: 4.5, author: "Marie" }).ok).toBe(false);
    expect(parseReview({ rating: "4", author: "Marie" })).toMatchObject({ ok: true, value: { rating: 4 } });
  });

  it("prénom obligatoire, textes nettoyés et bornés", () => {
    expect(parseReview({ rating: 3, author: " " }).ok).toBe(false);
    const r = parseReview({ rating: 3, author: "  Marie   D. ", text: "x".repeat(5000) });
    expect(r.ok && r.value.author).toBe("Marie D.");
    expect(r.ok && r.value.text.length).toBe(1000);
  });

  it("réponse du tatoueur", () => {
    expect(parseReply({ reply: "  Merci !  " })).toBe("Merci !");
    expect(parseReply({ reply: " " })).toBeNull();
    expect(parseReply({})).toBeNull();
  });
});

describe("note du tatoueur", () => {
  it("moyenne des avis publiés", () => {
    expect(summarizeRatings([])).toEqual({ rating: 0, count: 0 });
    expect(summarizeRatings([5, 4, 4])).toEqual({ rating: 4.33, count: 3 });
  });

  it("identifiant sur le site distinct des avis de démo", () => {
    expect(siteReviewId(12)).toBe("acc-rev-12");
  });
});
