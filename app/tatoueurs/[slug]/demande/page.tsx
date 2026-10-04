import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RequestWizard } from "@/components/request/RequestWizard";
import { artists } from "@/lib/data";

export const metadata: Metadata = { title: "Demander un projet", robots: { index: false } };

export default async function RequestPage({ params }: PageProps<"/tatoueurs/[slug]/demande">) {
  const { slug } = await params;
  const a = await artists.getBySlug(slug);
  if (!a) notFound();
  return (
    <Suspense>
      <RequestWizard artist={{ id: a.id, slug: a.slug, name: a.name, avatar: a.avatar, styles: a.styles, priceFrom: a.priceFrom, nextSlots: a.nextSlots }} />
    </Suspense>
  );
}
