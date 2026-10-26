"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { RequestThread } from "@/lib/requests/model";
import { Composer, MessageList, RequestSummary } from "./ThreadView";

/** Vue du tatoueur : la demande, les échanges, réponse / proposition de rendez-vous / refus. */
export function ArtistThread({ initial }: { initial: RequestThread }) {
  const router = useRouter();
  const [thread, setThread] = useState(initial);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(body: unknown): Promise<string | null> {
    const res = await fetch(`/api/compte/demandes/${thread.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res) return "Connexion impossible. Vérifie ta connexion et réessaie.";
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return data.error ?? "Envoi impossible. Réessaie.";
    // Mise à jour immédiate, puis rechargement des données du serveur.
    const b = body as { text?: string; slot?: { date: string; time: string } | null; decline?: boolean };
    setThread((t) => ({
      ...t,
      status: b.decline ? "declined" : b.slot ? "proposed" : "replied",
      messages: [...t.messages, { id: Date.now(), at: new Date().toISOString(), from: "artist", body: b.text ?? "", slot: b.slot ?? null }],
    }));
    router.refresh();
    return null;
  }

  async function decline() {
    setError(null);
    const err = await post({ decline: true });
    if (err) setError(err);
    setConfirmDecline(false);
  }

  const closed = thread.status === "declined";
  return (
    <div className="space-y-5 pt-2">
      <header>
        <h1 className="font-display text-[28px] leading-tight font-bold">{thread.clientName}</h1>
        {thread.clientPhone && (
          <a href={`tel:${thread.clientPhone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-[15px] font-medium text-accent">
            📞 {thread.clientPhone}
          </a>
        )}
      </header>

      <RequestSummary thread={thread} title="Demande reçue" />
      <MessageList messages={thread.messages} viewer="artist" otherName={thread.clientName} />
      {error && (
        <p role="alert" className="text-sm font-medium text-accent">
          {error}
        </p>
      )}

      {closed ? (
        <p className="rounded-2xl bg-surface-2 p-4 text-center text-[15px]">Tu as clôturé cette demande.</p>
      ) : (
        <>
          <Composer
            allowSlot
            placeholder={`Réponds à ${thread.clientName} : questions, devis, disponibilités…`}
            onSend={({ text, slot }) => post({ text, slot })}
          />
          <p className="text-xs text-muted">{thread.clientName} reçoit ta réponse par e-mail, avec un lien pour te répondre ici.</p>
          {confirmDecline ? (
            <div className="rounded-2xl border border-border p-4">
              <p className="text-[15px]">Clôturer la demande ? {thread.clientName} recevra un message poli lui indiquant que tu ne pourras pas réaliser ce projet.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => setConfirmDecline(false)}>
                  Annuler
                </Button>
                <Button variant="secondary" onClick={decline}>
                  Clôturer la demande
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDecline(true)} className="tap inline-flex h-11 items-center gap-1.5 text-sm text-muted">
              <Icon name="close" size={16} /> Je ne peux pas réaliser ce projet
            </button>
          )}
        </>
      )}
    </div>
  );
}
