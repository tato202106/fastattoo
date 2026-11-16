"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function StillActiveButton({ token }: { token: string }) {
  const [state, setState] = useState<{ kind: "idle" | "busy" } | { kind: "done"; online: boolean } | { kind: "error"; message: string }>({ kind: "idle" });

  async function confirm() {
    setState({ kind: "busy" });
    const res = await fetch("/api/compte/toujours-actif", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { online?: boolean; error?: string } | undefined;
    if (res?.ok) setState({ kind: "done", online: Boolean(data?.online) });
    else setState({ kind: "error", message: data?.error ?? "Action impossible. Réessaie dans un instant." });
  }

  if (state.kind === "done") {
    return (
      <div className="mt-6 rounded-2xl bg-success/10 p-4">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Icon name="check" size={20} strokeWidth={3} /> Merci, c&apos;est noté !
        </p>
        <p className="mt-1 text-[15px]">{state.online ? "Ton profil est en ligne sur la carte." : "Connecte-toi à ton espace tatoueur pour vérifier ton profil."}</p>
        <Link href="/espace-tatoueur" className={buttonClass("outline", "md", "mt-3 w-full")}>
          Mon espace tatoueur
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-3">
      {state.kind === "error" && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-sm text-accent">
          {state.message}
        </p>
      )}
      <Button size="lg" className="w-full" disabled={!token || state.kind === "busy"} onClick={confirm}>
        {state.kind === "busy" ? "Un instant…" : "Oui, je tatoue toujours"}
      </Button>
      <Link href="/espace-tatoueur" className={buttonClass("outline", "lg", "w-full")}>
        Faire une pause ou résilier
      </Link>
    </div>
  );
}
