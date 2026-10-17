"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/lib/store/app";

/** En-tête avec retour. Sans abonnement, « retour » ramène à l'accueil (le dashboard est verrouillé). */
export function BackHeader({ title }: { title: string }) {
  const router = useRouter();
  const subscribed = useApp((s) => s.subscription != null);
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-bg/95 px-2 pt-[calc(var(--safe-top)+6px)] pb-2 backdrop-blur-md lg:static">
      <button type="button" onClick={() => (subscribed ? router.push("/pro") : router.push("/"))} aria-label="Retour" className="tap inline-flex size-11 items-center justify-center rounded-full">
        <Icon name="back" size={22} />
      </button>
      <p className="text-lg font-semibold">{title}</p>
    </header>
  );
}
