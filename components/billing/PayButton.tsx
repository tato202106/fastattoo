"use client";

import clsx from "clsx";
import { useState } from "react";
import { LOGO_MARK_PATH } from "@/components/layout/Logo";
import { Icon } from "@/components/ui/Icon";

/**
 * Bouton de paiement, sobre et rassurant :
 * - à gauche le logo Fastattoo et l'action (« Fastattoo Pro · S'abonner »), à droite le montant ;
 * - au tap : léger enfoncement + onde discrète depuis le point touché ;
 * - pendant l'ouverture de Stripe : indicateur de chargement, libellé
 *   « Redirection sécurisée… » et fine barre de progression en bas du bouton.
 * Les animations sont réduites si l'utilisateur l'a demandé au système.
 */
export function PayButton({ busy, onClick, amount, period, disabled }: { busy: boolean; onClick: () => void; amount: string; period: string; disabled?: boolean }) {
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [press, setPress] = useState(0);

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-busy={busy}
      aria-label={busy ? "Redirection sécurisée vers le paiement" : `S'abonner : payer ${amount} par ${period}, paiement sécurisé`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setRipple({ x: e.clientX - r.left || r.width / 2, y: e.clientY - r.top || r.height / 2, key: Date.now() });
        setPress((n) => n + 1);
        navigator.vibrate?.(8);
        onClick();
      }}
      key={press}
      className={clsx(
        "group relative flex h-16 w-full items-center overflow-hidden rounded-xl pr-5 pl-3.5 text-left text-accent-fg select-none",
        "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_92%,white)_0%,var(--accent)_100%)]",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.12),0_6px_16px_-4px_color-mix(in_srgb,var(--accent)_55%,transparent)]",
        "transition-[filter,box-shadow] duration-150 hover:brightness-[1.04] focus-visible:outline-offset-4",
        press > 0 && "animate-pay-press",
        busy && "cursor-progress",
        disabled && !busy && "opacity-50",
      )}
    >
      {ripple && (
        <span
          key={ripple.key}
          aria-hidden
          className="animate-pay-ripple pointer-events-none absolute size-[520px] rounded-full bg-white"
          style={{ left: ripple.x, top: ripple.y }}
        />
      )}

      <span className={clsx("relative flex min-w-0 flex-1 items-center gap-3 transition-opacity duration-200", busy && "opacity-0")}>
        <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.18)]">
          <svg viewBox="0 0 100 100" className="size-7">
            <path d={LOGO_MARK_PATH} fillRule="evenodd" transform="translate(50 50) scale(0.9) translate(-50 -50)" className="fill-accent" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[11px] font-semibold tracking-[0.06em] uppercase opacity-80">Fastattoo Pro</span>
          <span className="truncate text-[16px] font-semibold tracking-[-0.01em] whitespace-nowrap">S&apos;abonner</span>
        </span>
      </span>
      <span className={clsx("relative flex shrink-0 items-baseline gap-1 whitespace-nowrap border-l border-white/25 pl-4 transition-opacity duration-200", busy && "opacity-0")}>
        <span className="text-[17px] font-bold tabular-nums">{amount}</span>
        <span className="text-xs font-medium opacity-80">/ {period}</span>
      </span>

      {busy && (
        <span className="absolute inset-0 flex items-center justify-center gap-2.5 text-[15px] font-semibold" aria-live="polite">
          <span aria-hidden className="size-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white" />
          Redirection sécurisée…
        </span>
      )}
      {busy && (
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-white/15">
          <span className="animate-pay-progress block h-full w-2/5 rounded-full bg-white/80" />
        </span>
      )}
    </button>
  );
}

/** Ligne de réassurance sous le bouton : Stripe + moyens de paiement acceptés. */
export function PaymentTrust() {
  return (
    <div className="mt-2.5 flex flex-col items-center gap-1.5">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon name="lock" size={13} /> Sécurisé par <span className="font-semibold text-fg">Stripe</span> · résiliable à tout moment
      </p>
      <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Moyens de paiement acceptés">
        {["CB", "Visa", "Mastercard", "Apple Pay", "Google Pay"].map((m) => (
          <li key={m} className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
