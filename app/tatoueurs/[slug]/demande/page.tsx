import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequestWizard } from "@/components/request/RequestWizard";
import { listPublicFlashes } from "@/lib/accounts/flashes-db";
import { artists } from "@/lib/data";
import { canRequestFlash, demoFlashes, type Flash } from "@/lib/flashes";
import { isDemoArtist } from "@/lib/showcase";
import { accountIdFromArtistId } from "@/lib/requests/model";

export const metadata: Metadata = { title: "Demander un projet", robots: { index: false } };

export default async function RequestPage({ params, searchParams }: PageProps<"/tatoueurs/[slug]/demande">) {
  const { slug } = await params;
  const a = await artists.getBySlug(slug);
  if (!a) notFound();
  const { flash: flashId } = await searchParams;
  const flash = typeof flashId === "string" ? await findFlash(a, flashId) : null;
  return (
    <Suspense>
      <RequestWizard artist={{ id: a.id, slug: a.slug, name: a.name, avatar: a.avatar, styles: a.styles, priceFrom: a.priceFrom, nextSlots: a.nextSlots, real: accountIdFromArtistId(a.id) != null }} flash={flash} />
    </Suspense>
  );
}

/** Flash choisi sur le profil (« Je le veux »), s'il est toujours disponible. */
async function findFlash(a: { id: string; styles: Flash["style"][]; priceFrom: number }, id: string): Promise<Flash | null> {
  let list: Flash[] = [];
  if (isDemoArtist(a)) list = demoFlashes(a);
  else {
    const accountId = accountIdFromArtistId(a.id);
    if (accountId != null && process.env.DATABASE_URL) list = await listPublicFlashes(accountId).catch(() => []);
  }
  const flash = list.find((f) => f.id === id);
  return flash && canRequestFlash(flash) ? flash : null;
}
