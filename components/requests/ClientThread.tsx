"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { RequestThread } from "@/lib/requests/model";
import { Composer, MessageList, RequestSummary } from "./ThreadView";

/** Vue du client : sa demande, les réponses du tatoueur, et la zone de réponse. */
export function ClientThread({ token, initial, justSent }: { token: string; initial: RequestThread; justSent: boolean }) {
  const [thread, setThread] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const res = await fetch(`/api/demandes/${token}`, { cache: "no-store" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { thread?: RequestThread } | null;
    if (data?.thread) setThread(data.thread);
  }

  // Nouvelles réponses : vérifiées toutes les 30 s tant que la page est ouverte.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function post(body: unknown): Promise<string | null> {
    const res = await fetch(`/api/demandes/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res) return "Connexion impossible. Vérifie ta connexion et réessaie.";
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return data.error ?? "Envoi impossible. Réessaie.";
    await reload();
    return null;
  }

  async function acceptSlot(messageId: number) {
    setError(null);
    const err = await post({ acceptSlot: messageId });
    if (err) setError(err);
  }

  const closed = thread.status === "declined";
  const artistReplied = thread.messages.some((m) => m.from === "artist");
  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="font-display text-[28px] leading-tight font-bold">Projet avec {thread.artistName}</h1>
        <p className="mt-1 text-sm text-muted">Garde le lien de cette page : c&apos;est ton accès personnel à la conversation.</p>
      </header>

      {justSent && (
        <div className="rounded-2xl bg-success/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-success">
            <Icon name="check" size={20} strokeWidth={3} /> Demande envoyée !
          </p>
          <p className="mt-1 text-[15px]">
            {thread.artistName} l&apos;a reçue par e-mail. Tu recevras toi aussi un e-mail dès qu&apos;il ou elle te répond, avec le lien de cette page.
          </p>
        </div>
      )}

      <RequestSummary thread={thread} title="Ta demande" />

      {!artistReplied && !justSent && <p className="text-center text-sm text-muted">En attente de la réponse de {thread.artistName}.</p>}

      <MessageList messages={thread.messages} viewer="client" otherName={thread.artistName} onAcceptSlot={acceptSlot} canAccept={thread.status === "proposed"} />
      {error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      )}

      {closed ? (
        <p className="rounded-2xl bg-surface-2 p-4 text-center text-[15px]">{thread.artistName} a clôturé cette demande. Tu peux en envoyer une à un autre tatoueur depuis la carte.</p>
      ) : (
        <Composer placeholder={`Écris à ${thread.artistName}…`} onSend={({ text }) => post({ text })} />
      )}
    </div>
  );
}
