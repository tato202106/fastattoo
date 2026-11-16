"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LOGO_MARK_PATH } from "@/components/layout/Logo";
import type { ShareChannel } from "@/lib/share-kit";

type Texts = { bio: string; story: string; message: string; review: string };

/** Copie dans le presse-papiers avec un retour « Copié ». */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 2000);
    } catch {
      window.prompt("Copie ce texte :", text);
    }
  }
  return { copied, copy };
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-[22px] font-bold">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

export function ShareKit({
  name,
  place,
  profileUrl,
  links,
  texts,
  qr,
}: {
  name: string;
  place: string;
  profileUrl: string;
  links: Record<ShareChannel, string>;
  texts: Texts;
  qr: { path: string; size: number };
}) {
  const { copied, copy } = useCopy();

  async function share() {
    const data = { title: `${name} · Fastattoo`, text: `Mon portfolio et mes disponibilités sur Fastattoo`, url: links.lien };
    try {
      if (navigator.share) await navigator.share(data);
      else await copy("lien", links.lien);
    } catch {
      // partage annulé
    }
  }

  const textBlocks: { key: keyof Texts; label: string }[] = [
    { key: "bio", label: "Bio Instagram / TikTok" },
    { key: "story", label: "Légende de ta story" },
    { key: "message", label: "Réponse à un client qui te contacte" },
    { key: "review", label: "Demande d'avis après une séance" },
  ];

  return (
    <>
      <Section title="Ton lien" hint="Mets-le dans ta bio Instagram et TikTok, et envoie-le à chaque client qui te demande tes dispos.">
        <div className="rounded-2xl bg-surface p-4 shadow-card">
          <p className="truncate text-[15px] font-medium">{profileUrl.replace(/^https?:\/\//, "")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={share}>
              <Icon name="share" size={18} /> Partager
            </Button>
            <Button variant="outline" onClick={() => copy("bio-lien", links.bio)}>
              <Icon name={copied === "bio-lien" ? "check" : "link"} size={18} /> {copied === "bio-lien" ? "Copié" : "Copier"}
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Story Instagram / TikTok" hint="Une image prête à publier avec ta plus belle photo et un QR code vers ton profil. Ajoute le sticker « Lien » vers ton profil.">
        <div className="flex gap-4 rounded-2xl bg-surface p-4 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- image générée à la demande */}
          <img src="/api/compte/kit/story" alt="Aperçu de ta story" width={1080} height={1920} className="aspect-[9/16] w-32 shrink-0 rounded-xl bg-surface-2 object-cover" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <a href="/api/compte/kit/story?telecharger=1" download className={buttonClass("primary", "md", "w-full")}>
              <Icon name="download" size={18} /> Télécharger
            </a>
            <p className="text-xs text-muted">Ta première photo du portfolio est utilisée : change l&apos;ordre de tes photos pour en choisir une autre.</p>
          </div>
        </div>
      </Section>

      <Section title="QR code pour ton studio" hint="Imprime l'affiche et pose-la sur ton comptoir ou ta vitrine : tes clients scannent pour voir ton portfolio, réserver ou te laisser un avis.">
        <div className="print-poster mx-auto flex aspect-[1/1.414] w-full max-w-sm flex-col items-center justify-between rounded-2xl bg-white p-8 text-center text-[#151413] shadow-card">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 100 100" aria-hidden className="size-7 print:size-14">
              <rect width="100" height="100" rx="28" fill="#151413" />
              <path d={LOGO_MARK_PATH} fillRule="evenodd" transform="translate(50 50) scale(0.78) translate(-50 -50)" fill="#ffffff" />
            </svg>
            <span className="text-lg font-bold print:text-4xl">fastattoo</span>
          </div>
          <div>
            <p className="font-display text-[26px] leading-tight font-bold print:text-6xl">{name}</p>
            {place && <p className="mt-1 text-sm text-[#5c5752] print:mt-4 print:text-3xl">{place}</p>}
          </div>
          <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="w-3/5" shapeRendering="crispEdges" role="img" aria-label="QR code vers ton profil">
            <rect width={qr.size} height={qr.size} fill="#ffffff" />
            <path d={qr.path} fill="#151413" />
          </svg>
          <div>
            <p className="text-lg font-bold print:text-5xl">Scanne-moi</p>
            <p className="text-sm text-[#5c5752] print:mt-4 print:text-2xl">Portfolio · Rendez-vous · Laisse un avis</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => window.print()}>
            <Icon name="download" size={18} /> Imprimer l&apos;affiche
          </Button>
          <a href="/api/compte/kit/qr" download className={buttonClass("outline", "md")}>
            QR code seul
          </a>
        </div>
      </Section>

      <Section title="Textes prêts à copier" hint="Ton lien est déjà dedans.">
        <div className="space-y-3">
          {textBlocks.map(({ key, label }) => (
            <div key={key} className="rounded-2xl bg-surface p-4 shadow-card">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-[15px] break-words whitespace-pre-line text-muted">{texts[key]}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => copy(key, texts[key])}>
                <Icon name={copied === key ? "check" : "link"} size={16} /> {copied === key ? "Copié" : "Copier"}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        Astuce : chaque support a son propre lien (QR code, story, bio). Toutes les visites arrivent sur le même profil.
      </p>
    </>
  );
}
