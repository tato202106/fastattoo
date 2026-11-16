import type { Metadata } from "next";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { activeLinkSecret } from "@/lib/accounts/inactivity";
import { reviewContext } from "@/lib/accounts/reviews-db";
import { formatLongDate } from "@/lib/dates";
import { verifyReviewLinkToken } from "@/lib/reviews";

export const metadata: Metadata = { title: "Donner mon avis", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Page du lien personnel envoyé au client après son rendez-vous. */
export default async function ReviewPage({ searchParams }: PageProps<"/avis">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";
  const entryId = verifyReviewLinkToken(activeLinkSecret(), token, Date.now());
  const ctx = entryId && process.env.DATABASE_URL ? await reviewContext(entryId).catch(() => null) : null;

  return (
    <main className="mx-auto max-w-md px-4 pt-safe pb-nav lg:pt-10">
      {!ctx ? (
        <>
          <h1 className="pt-6 font-display text-[28px] leading-tight font-bold">Lien expiré</h1>
          <p className="mt-2 text-[15px] text-muted">Ce lien n&apos;est plus valable. Il ne sert que pendant 60 jours après ton rendez-vous.</p>
        </>
      ) : ctx.alreadyReviewed ? (
        <>
          <h1 className="pt-6 font-display text-[28px] leading-tight font-bold">Merci, c&apos;est déjà fait !</h1>
          <p className="mt-2 text-[15px] text-muted">Tu as déjà donné ton avis pour ce rendez-vous avec {ctx.artist.name || "ton tatoueur"}.</p>
        </>
      ) : (
        <>
          <h1 className="pt-6 font-display text-[28px] leading-tight font-bold">Comment s&apos;est passé ton tatouage ?</h1>
          <p className="mt-2 text-[15px] text-muted">
            Avec <strong className="text-fg">{ctx.artist.name || "ton tatoueur"}</strong>
            {ctx.artist.studio ? ` (${ctx.artist.studio})` : ""}, le {formatLongDate(ctx.date)}.
          </p>
          <ReviewForm token={token} suggestedAuthor={ctx.suggestedAuthor} />
        </>
      )}
    </main>
  );
}
