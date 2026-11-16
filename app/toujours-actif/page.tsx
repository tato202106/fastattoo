import type { Metadata } from "next";
import { StillActiveButton } from "@/components/espace/StillActiveButton";

export const metadata: Metadata = { title: "Je tatoue toujours", robots: { index: false } };

/** Page du lien « Je suis toujours actif » envoyé aux tatoueurs inactifs. */
export default async function StillActivePage({ searchParams }: PageProps<"/toujours-actif">) {
  const { t } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 pt-safe pb-nav lg:pt-10">
      <h1 className="pt-6 font-display text-[28px] leading-tight font-bold">Tu tatoues toujours ?</h1>
      <p className="mt-2 text-[15px] text-muted">
        Confirme-le en un clic : ton profil reste (ou revient) sur la carte, et on ne t&apos;embête plus avant un bon moment.
      </p>
      <StillActiveButton token={typeof t === "string" ? t : ""} />
    </main>
  );
}
