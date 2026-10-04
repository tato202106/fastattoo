"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { FavoriteButton } from "./FavoriteButton";

/** Boutons flottants sur l'image de couverture : retour, partager, favori. */
export function ProfileTopBar({ artistId, name }: { artistId: string; name: string }) {
  const router = useRouter();
  const share = async () => {
    const data = { title: `${name} · Fastattoo`, text: `Découvre le travail de ${name} sur Fastattoo`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        alert("Lien copié");
      }
    } catch {
      // partage annulé
    }
  };
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pt-[calc(var(--safe-top)+10px)] lg:hidden">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/explorer"))}
        aria-label="Retour"
        className="tap inline-flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md"
      >
        <Icon name="back" size={22} />
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={share} aria-label="Partager" className="tap inline-flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md">
          <Icon name="share" size={20} />
        </button>
        <FavoriteButton artistId={artistId} name={name} variant="overlay" />
      </div>
    </div>
  );
}
