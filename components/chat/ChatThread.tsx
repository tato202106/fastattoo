"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { Avatar, InitialsAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { Sheet } from "@/components/ui/Sheet";
import { relativeDay, toISODate } from "@/lib/dates";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";
import type { Artist, ImageAsset } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { MessageBubble } from "./MessageBubble";
import { ProposeSlotSheet } from "./ProposeSlotSheet";

/** Conversation client ↔ tatoueur (SPEC §23) : texte, photos, références, prix, rendez-vous. */
export function ChatThread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);
  const conversation = useApp((s) => s.conversations.find((c) => c.id === conversationId));
  const sendMessage = useApp((s) => s.sendMessage);
  const markRead = useApp((s) => s.markConversationRead);

  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sentBanner, setSentBanner] = useState(params.get("envoye") === "1");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const side: "client" | "artist" = session?.role === "artist" ? "artist" : "client";
  const count = conversation?.messages.length ?? 0;

  useEffect(() => {
    if (conversation && conversation.unread[side] > 0) markRead(conversation.id, side);
  }, [conversation, side, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count, hydrated]);

  if (!hydrated) return <div className="skeleton h-dvh" aria-label="Chargement" />;
  if (!conversation) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">Conversation introuvable.</p>
        <Link href="/messages" className="text-accent underline">
          Retour aux messages
        </Link>
      </div>
    );
  }

  const isArtist = side === "artist";
  const otherName = isArtist ? conversation.clientName : conversation.artistName;
  const send = (body: Parameters<typeof sendMessage>[2]) => sendMessage(conversation.id, side, body);

  const onPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const image = await uploadImage(file, "Photo partagée");
      send({ kind: "photo", image });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  type Action = "camera" | "gallery" | "reference" | "price" | "slot";
  const actions: { key: Action; icon: IconName; label: string; artistOnly?: boolean }[] = [
    { key: "camera", icon: "camera", label: "Prendre une photo" },
    { key: "gallery", icon: "image", label: "Choisir une photo" },
    { key: "reference", icon: "link", label: isArtist ? "Envoyer une référence du portfolio" : "Partager une référence du portfolio" },
    { key: "price", icon: "euro", label: "Envoyer un prix", artistOnly: true },
    { key: "slot", icon: "calendar", label: "Proposer un créneau", artistOnly: true },
  ];
  function runAction(key: Action) {
    setAttachOpen(false);
    if (key === "camera") cameraRef.current?.click();
    else if (key === "gallery") fileRef.current?.click();
    else if (key === "reference") setRefOpen(true);
    else if (key === "price") setPriceOpen(true);
    else setSlotOpen(true);
  }
  const dayOf = (at: number) => toISODate(new Date(at));
  const thread = conversation.messages.map((m, i, all) => ({ m, day: dayOf(m.at), showDay: i === 0 || dayOf(all[i - 1]!.at) !== dayOf(m.at) }));

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-bg lg:h-[calc(100dvh-64px)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-surface/95 px-2 pt-[calc(var(--safe-top)+6px)] pb-2 backdrop-blur-md">
        <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/messages"))} aria-label="Retour" className="tap inline-flex size-11 items-center justify-center rounded-full">
          <Icon name="back" size={22} />
        </button>
        {isArtist ? <InitialsAvatar name={otherName} size={40} /> : <Avatar image={conversation.artistAvatar} size={40} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{otherName}</p>
          <p className="truncate text-xs text-muted">{isArtist ? "Client" : "Tatoueur·se"}</p>
        </div>
        {!isArtist && (
          <Link href={`/tatoueurs/${conversation.artistSlug}`} className="tap inline-flex h-10 items-center rounded-full border border-border px-3 text-sm font-semibold">
            Profil
          </Link>
        )}
      </header>

      {sentBanner && (
        <div className="flex items-center gap-3 bg-success/12 px-4 py-3 text-sm" role="status">
          <span className="text-xl">🎉</span>
          <p className="flex-1">
            <strong>Demande envoyée à {conversation.artistName}.</strong> Tu recevras une notification dès sa réponse.
          </p>
          <button type="button" aria-label="Fermer" onClick={() => setSentBanner(false)} className="inline-flex size-9 items-center justify-center">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite">
        {thread.map(({ m, day, showDay }) => {
          return (
            <Fragment key={m.id}>
              {showDay && <p className="py-2 text-center text-xs font-medium text-muted first-letter:uppercase">{relativeDay(day)}</p>}
              <MessageBubble message={m} conversation={conversation} side={side} onProposeSlot={() => setSlotOpen(true)} />
            </Fragment>
          );
        })}
        {uploading && (
          <div className="flex justify-end">
            <div className="skeleton h-40 w-48 rounded-3xl" aria-label="Envoi de la photo" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-border bg-surface px-2 pt-2 pb-[calc(8px+var(--safe-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          send({ kind: "text", text: t });
          setText("");
        }}
      >
        <button type="button" onClick={() => setAttachOpen(true)} aria-label="Ajouter une pièce jointe" className="tap inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2">
          <Icon name="plus" size={22} />
        </button>
        <label className="sr-only" htmlFor="composer">
          Message
        </label>
        <textarea
          id="composer"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Écris un message…"
          enterKeyHint="send"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-border bg-bg px-4 py-2.5 leading-snug outline-none [field-sizing:content] focus:border-fg"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Envoyer" className="tap inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg disabled:opacity-40">
          <Icon name="send" size={20} />
        </button>
      </form>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onPhoto(e.target.files).finally(() => (e.target.value = ""))} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void onPhoto(e.target.files).finally(() => (e.target.value = ""))} />

      <Sheet open={attachOpen} onClose={() => setAttachOpen(false)} title="Envoyer">
        <ul className="pb-2">
          {actions
            .filter((a) => !a.artistOnly || isArtist)
            .map((a) => (
              <li key={a.key}>
                <button
                  type="button"
                  onClick={() => runAction(a.key)}
                  className="tap flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 text-left text-[15px] font-medium"
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface-2">
                    <Icon name={a.icon} size={22} />
                  </span>
                  {a.label}
                </button>
              </li>
            ))}
        </ul>
      </Sheet>

      {isArtist && <ProposeSlotSheet open={slotOpen} onClose={() => setSlotOpen(false)} artistId={conversation.artistId} conversationId={conversation.id} />}
      <PriceSheet open={priceOpen} onClose={() => setPriceOpen(false)} onSend={(amount, label) => send({ kind: "price", amount, label })} />
      <ReferenceSheet open={refOpen} onClose={() => setRefOpen(false)} artistSlug={conversation.artistSlug} onPick={(image) => send({ kind: "reference", image, text: isArtist ? "Dans cet esprit ?" : "J'adore celui-ci !" })} />
    </div>
  );
}

function PriceSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (amount: number, label: string) => void }) {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const value = Number(amount);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Envoyer un prix"
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!(value > 0)}
          onClick={() => {
            onSend(Math.round(value), label.trim() || "Devis");
            setAmount("");
            setLabel("");
            onClose();
          }}
        >
          Envoyer le devis
        </Button>
      }
    >
      <label className="flex h-20 items-center gap-2 rounded-2xl border border-border px-4 focus-within:border-fg">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="0" aria-label="Montant en euros" className="w-full bg-transparent text-4xl font-bold outline-none" />
        <span className="text-2xl font-bold text-muted">€</span>
      </label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Détail (ex. pièce fine line, ~2 h)" className="mt-3 h-12 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-fg" />
    </Sheet>
  );
}

function ReferenceSheet({ open, onClose, artistSlug, onPick }: { open: boolean; onClose: () => void; artistSlug: string; onPick: (image: ImageAsset) => void }) {
  const [items, setItems] = useState<ImageAsset[] | null>(null);
  useEffect(() => {
    if (!open || items) return;
    fetch(`/api/artists/${artistSlug}`)
      .then((r) => r.json() as Promise<Artist>)
      .then((a) => setItems(a.portfolio))
      .catch(() => setItems([]));
  }, [open, items, artistSlug]);
  return (
    <Sheet open={open} onClose={onClose} title="Choisir une référence">
      <div className="grid grid-cols-3 gap-1.5 pb-2">
        {items == null && Array.from({ length: 9 }).map((_, i) => <div key={i} className="skeleton aspect-square rounded-xl" />)}
        {items?.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              onPick(img);
              onClose();
            }}
            className="tap relative aspect-square overflow-hidden rounded-xl"
            aria-label={img.alt}
          >
            <Picture image={img} usage="list" fill sizes="33vw" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
