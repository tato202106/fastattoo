"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { formatShortDay, relativeDay } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { artAsset } from "@/lib/store/demo";
import { useHydrated } from "@/lib/store/hydration";
import { TATTOO_SIZES, type TattooSize } from "@/lib/store/model";
import { BODY_ZONES, STYLES, styleLabel, zoneLabel } from "@/lib/styles";
import type { BodyZone, ImageAsset, Slot, StyleSlug } from "@/lib/types";
import { uploadImage } from "@/lib/upload";

export interface WizardArtist {
  id: string;
  slug: string;
  name: string;
  avatar: ImageAsset;
  styles: StyleSlug[];
  priceFrom: number;
  nextSlots: Slot[];
}

interface Draft {
  description: string;
  styles: StyleSlug[];
  zone: BodyZone | null;
  size: TattooSize | null;
  budget: [number, number] | null;
  dates: string[];
  flexible: boolean;
  inspirations: ImageAsset[];
}

const BUDGETS: { label: string; value: [number, number] }[] = [
  { label: "Moins de 100 €", value: [50, 100] },
  { label: "100 – 200 €", value: [100, 200] },
  { label: "200 – 300 €", value: [200, 300] },
  { label: "300 – 500 €", value: [300, 500] },
  { label: "Plus de 500 €", value: [500, 1000] },
];

const IDEAS = ["Une fleur fine sur le poignet", "Un mandala sur l'épaule", "Une vague japonaise sur l'avant-bras", "Les initiales de mes proches"];

const TOTAL = 8;
const draftKey = (slug: string) => `fastattoo-draft-${slug}`;

/**
 * Formulaire projet (SPEC §17) : 8 petites étapes, une question par écran,
 * bouton « Continuer » dans la zone du pouce, progression « 6 / 8 ».
 * Le brouillon est conservé dans l'onglet (sessionStorage).
 */
export function RequestWizard({ artist }: { artist: WizardArtist }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const login = useApp((s) => s.login);
  const createRequest = useApp((s) => s.createRequest);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => ({
    description: "",
    styles: artist.styles.slice(0, 1),
    zone: null,
    size: null,
    budget: null,
    dates: [],
    flexible: false,
    inspirations: [],
  }));
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const restored = useRef(false);

  // Restaure le brouillon + créneau présélectionné depuis le profil.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = sessionStorage.getItem(draftKey(artist.slug));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restauration unique du brouillon
      if (saved) setDraft((d) => ({ ...d, ...(JSON.parse(saved) as Partial<Draft>) }));
    } catch {
      /* ignore */
    }
    const slot = params.get("creneau");
    if (slot && /^\d{4}-\d{2}-\d{2}_\d{2}:\d{2}$/.test(slot)) setDraft((d) => ({ ...d, dates: [...new Set([...d.dates, slot.split("_")[0]!])] }));
  }, [artist.slug, params]);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(artist.slug), JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, artist.slug]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const canContinue: Record<number, boolean> = {
    1: draft.description.trim().length >= 8,
    2: draft.styles.length > 0,
    3: draft.zone != null,
    4: draft.size != null,
    5: draft.budget != null,
    6: draft.flexible || draft.dates.length > 0,
    7: uploading === 0,
    8: !sending && (session != null || (name.trim().length > 1 && /\S+@\S+\.\S+/.test(email))),
  };

  const back = () => (step > 1 ? setStep(step - 1) : router.back());

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    const list = Array.from(files).slice(0, 5 - draft.inspirations.length);
    setUploading((n) => n + list.length);
    await Promise.all(
      list.map(async (f) => {
        try {
          const asset = await uploadImage(f, "Inspiration");
          setDraft((d) => ({ ...d, inspirations: [...d.inspirations, asset] }));
        } catch (e) {
          setUploadError((e as Error).message);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
  };

  const send = () => {
    if (!draft.zone || !draft.size || !draft.budget) return;
    setSending(true);
    if (!session) login("client", name, email);
    const request = createRequest({
      artistId: artist.id,
      artistName: artist.name,
      artistSlug: artist.slug,
      artistAvatar: artist.avatar,
      description: draft.description.trim(),
      styles: draft.styles,
      zone: draft.zone,
      size: draft.size,
      budgetMin: draft.budget[0],
      budgetMax: draft.budget[1],
      dates: draft.flexible ? [] : draft.dates,
      inspirations: draft.inspirations,
    });
    try {
      sessionStorage.removeItem(draftKey(artist.slug));
    } catch {
      /* ignore */
    }
    router.replace(`/messages/${request.conversationId}?envoye=1`);
  };

  const questions: Record<number, string> = {
    1: "Quel tatouage veux-tu ?",
    2: "Quel style ?",
    3: "Où ?",
    4: "Quelle taille ?",
    5: "Quel budget ?",
    6: "Quand ?",
    7: "Ajoute tes inspirations",
    8: "Prêt à envoyer ?",
  };

  const orderedStyles = [...STYLES].sort((a, b) => Number(artist.styles.includes(b.slug)) - Number(artist.styles.includes(a.slug)));
  const slotDates = [...new Set(artist.nextSlots.map((s) => s.date))].slice(0, 9);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 px-2 pt-[calc(var(--safe-top)+6px)] pb-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button type="button" onClick={back} aria-label={step > 1 ? "Étape précédente" : "Quitter"} className="tap inline-flex size-11 items-center justify-center rounded-full">
            <Icon name={step > 1 ? "back" : "close"} size={22} />
          </button>
          <Avatar image={artist.avatar} size={32} />
          <p className="flex-1 truncate text-sm font-semibold">Projet avec {artist.name}</p>
          <span className="pr-3 text-sm font-semibold tabular-nums" aria-label={`Étape ${step} sur ${TOTAL}`}>
            {step} / {TOTAL}
          </span>
        </div>
        <div className="mx-2 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-[calc(110px+var(--safe-bottom))]">
        <h1 className="font-display text-[28px] leading-tight font-bold">{questions[step]}</h1>

        {step === 1 && (
          <div className="mt-5">
            <label htmlFor="desc" className="sr-only">
              Décris ton projet
            </label>
            <textarea
              id="desc"
              autoFocus
              rows={5}
              value={draft.description}
              onChange={(e) => set("description", e.target.value.slice(0, 600))}
              placeholder="Décris ton idée en quelques mots…"
              className="w-full resize-none rounded-2xl border border-border bg-surface p-4 leading-relaxed outline-none focus:border-fg"
            />
            <p className="mt-1 text-right text-xs text-muted">{draft.description.length} / 600</p>
            <p className="mt-3 text-sm text-muted">Besoin d&apos;inspiration ?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {IDEAS.map((idea) => (
                <button key={idea} type="button" onClick={() => set("description", idea)} className="tap rounded-full bg-surface-2 px-3 py-2 text-sm">
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {orderedStyles.map((s, i) => {
              const selected = draft.styles.includes(s.slug);
              return (
                <button
                  key={s.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => set("styles", selected ? draft.styles.filter((x) => x !== s.slug) : [...draft.styles, s.slug])}
                  className={clsx("tap relative aspect-[4/3] overflow-hidden rounded-2xl ring-[3px] ring-offset-2 ring-offset-bg", selected ? "ring-accent" : "ring-transparent")}
                >
                  <Picture image={artAsset(s.slug, 9000 + STYLES.indexOf(s) * 7, s.label)} usage="list" fill sizes="50vw" priority={i < 4} />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute bottom-2 left-3 text-left text-[15px] font-semibold text-white">{s.label}</span>
                  {artist.styles.includes(s.slug) && <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-black">Sa spécialité</span>}
                  {selected && (
                    <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-accent text-accent-fg">
                      <Icon name="check" size={16} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {BODY_ZONES.map((z) => (
              <button
                key={z.slug}
                type="button"
                aria-pressed={draft.zone === z.slug}
                onClick={() => {
                  set("zone", z.slug);
                  setTimeout(() => setStep(4), 180);
                }}
                className={clsx("tap h-16 rounded-2xl border text-[15px] font-semibold", draft.zone === z.slug ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
              >
                {z.label}
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="mt-5 space-y-3">
            {TATTOO_SIZES.map((s, i) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={draft.size === s.value}
                onClick={() => {
                  set("size", s.value);
                  setTimeout(() => setStep(5), 180);
                }}
                className={clsx("tap flex h-20 w-full items-center gap-4 rounded-2xl border px-4 text-left", draft.size === s.value ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
              >
                <span className="flex w-12 items-center justify-center">
                  <span className="rounded-full border-[3px] border-current" style={{ width: 14 + i * 12, height: 14 + i * 12 }} />
                </span>
                <span>
                  <span className="block text-lg font-semibold">{s.label}</span>
                  <span className="block text-sm opacity-70">{s.hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-muted">
              {artist.name} travaille à partir de <strong className="text-fg">{artist.priceFrom} €</strong>.
            </p>
            <div className="space-y-2">
              {BUDGETS.map((b) => {
                const selected = draft.budget?.[0] === b.value[0] && draft.budget[1] === b.value[1];
                return (
                  <button
                    key={b.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      set("budget", b.value);
                      setTimeout(() => setStep(6), 180);
                    }}
                    className={clsx("tap flex h-14 w-full items-center justify-between rounded-2xl border px-4 text-[15px] font-semibold", selected ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                  >
                    {b.label}
                    {b.value[1] < artist.priceFrom && <span className="text-xs font-normal text-warning">sous son tarif de départ</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="mt-5">
            <Chip
              selected={draft.flexible}
              onClick={() => setDraft((d) => ({ ...d, flexible: !d.flexible, dates: !d.flexible ? [] : d.dates }))}
              className="w-full justify-center"
            >
              <Icon name="sparkle" size={18} /> Je suis flexible
            </Chip>
            <p className="mt-5 mb-2 text-sm font-semibold">Ou choisis jusqu&apos;à 3 dates préférées</p>
            {slotDates.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {slotDates.map((d) => {
                  const selected = draft.dates.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && draft.dates.length >= 3}
                      onClick={() => setDraft((x) => ({ ...x, flexible: false, dates: selected ? x.dates.filter((y) => y !== d) : [...x.dates, d] }))}
                      className={clsx("tap flex h-16 flex-col items-center justify-center rounded-2xl border text-sm disabled:opacity-40", selected ? "border-fg bg-fg text-bg" : "border-border bg-surface")}
                    >
                      <span className="text-xs opacity-70">{relativeDay(d)}</span>
                      <span className="font-semibold">{formatShortDay(d).split(" ").slice(1).join(" ")}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">Pas de créneau publié : indique que tu es flexible.</p>
            )}
            <p className="mt-3 text-xs text-muted">Dates où {artist.name} a des créneaux libres. Le rendez-vous sera confirmé dans la messagerie.</p>
          </div>
        )}

        {step === 7 && (
          <div className="mt-5">
            <p className="text-sm text-muted">Photos, captures, dessins… (facultatif, 5 max)</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {draft.inspirations.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-2xl">
                  <Picture image={img} usage="list" fill sizes="33vw" />
                  <button
                    type="button"
                    aria-label="Retirer la photo"
                    onClick={() => set("inspirations", draft.inspirations.filter((i) => i.id !== img.id))}
                    className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <div key={`u${i}`} className="skeleton aspect-square rounded-2xl" aria-label="Envoi en cours" />
              ))}
              {draft.inspirations.length + uploading < 5 && (
                <button type="button" onClick={() => fileRef.current?.click()} className="tap flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-muted">
                  <Icon name="plus" size={26} />
                  <span className="text-xs font-medium">Ajouter</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files).finally(() => (e.target.value = ""))} />
            {uploadError && <p className="mt-3 text-sm text-accent">{uploadError}</p>}
          </div>
        )}

        {step === 8 && (
          <div className="mt-5 space-y-4">
            <dl className="divide-y divide-border rounded-2xl bg-surface shadow-card">
              {[
                ["Projet", draft.description, 1],
                ["Style", draft.styles.map(styleLabel).join(", "), 2],
                ["Emplacement", draft.zone ? zoneLabel(draft.zone) : "—", 3],
                ["Taille", TATTOO_SIZES.find((s) => s.value === draft.size)?.label ?? "—", 4],
                ["Budget", draft.budget ? `${draft.budget[0]} – ${draft.budget[1]} €` : "—", 5],
                ["Quand", draft.flexible || draft.dates.length === 0 ? "Flexible" : draft.dates.map((d) => formatShortDay(d)).join(", "), 6],
                ["Inspirations", draft.inspirations.length ? `${draft.inspirations.length} photo(s)` : "Aucune", 7],
              ].map(([label, value, target]) => (
                <div key={label as string} className="flex items-start gap-3 p-4">
                  <dt className="w-28 shrink-0 text-sm text-muted">{label}</dt>
                  <dd className="min-w-0 flex-1 text-[15px] break-words">{value}</dd>
                  <button type="button" onClick={() => setStep(target as number)} className="text-sm font-semibold text-accent">
                    Modifier
                  </button>
                </div>
              ))}
            </dl>
            {hydrated && !session && (
              <div className="space-y-3 rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold">Pour recevoir la réponse de {artist.name}</p>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom" autoComplete="given-name" className="h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ton e-mail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg"
                />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-bg/95 px-4 pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-xl gap-3">
          {step === 7 && draft.inspirations.length === 0 && uploading === 0 && (
            <Button variant="outline" size="lg" onClick={() => setStep(8)}>
              Passer
            </Button>
          )}
          <Button size="lg" className="flex-1" disabled={!canContinue[step]} onClick={() => (step < TOTAL ? setStep(step + 1) : send())}>
            {step < TOTAL ? "Continuer" : sending ? "Envoi…" : "Envoyer ma demande"}
            {step === TOTAL && <Icon name="send" size={18} />}
          </Button>
        </div>
      </footer>
    </div>
  );
}

