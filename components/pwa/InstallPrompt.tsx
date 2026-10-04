"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { isIOS, isStandalone, promptInstall, useInstall } from "@/lib/pwa";
import { useApp } from "@/lib/store/app";
import { useHydrated } from "@/lib/store/hydration";

const noop = () => () => {};
function useClientEnv() {
  return useSyncExternalStore(
    noop,
    () => (isStandalone() ? "standalone" : isIOS() ? "ios" : "web"),
    () => "server" as const,
  );
}

/** Instructions iOS : Safari n'a pas d'invite d'installation automatique. */
function IOSInstructions({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajouter à l'écran d'accueil">
      <ol className="space-y-4 py-2 text-[15px]">
        <li className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-2 font-semibold">1</span>
          <span>
            Touche <Icon name="share" size={18} className="inline align-text-bottom" /> <strong>Partager</strong> dans la barre de Safari
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-2 font-semibold">2</span>
          <span>
            Choisis <strong>Sur l&apos;écran d&apos;accueil</strong>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-surface-2 font-semibold">3</span>
          <span>
            Touche <strong>Ajouter</strong> : Fastattoo s&apos;ouvre comme une app ✨
          </span>
        </li>
      </ol>
    </Sheet>
  );
}

function useInstallAction() {
  const env = useClientEnv();
  const deferred = useInstall((s) => s.deferred);
  const installed = useInstall((s) => s.installed);
  const [iosOpen, setIosOpen] = useState(false);
  const available = env !== "standalone" && env !== "server" && !installed && (deferred !== null || env === "ios");
  const install = () => (env === "ios" ? setIosOpen(true) : void promptInstall());
  return { available, install, iosSheet: <IOSInstructions open={iosOpen} onClose={() => setIosOpen(false)} /> };
}

/** Bannière discrète sur l'accueil, masquable (30 jours). */
export function InstallBanner() {
  const hydrated = useHydrated();
  const dismissedAt = useApp((s) => s.installDismissedAt);
  const dismiss = useApp((s) => s.dismissInstall);
  const { available, install, iosSheet } = useInstallAction();
  const [now] = useState(() => Date.now());
  const recentlyDismissed = dismissedAt != null && now - dismissedAt < 30 * 86_400_000;
  if (!hydrated || !available || recentlyDismissed) return iosSheet;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-fg text-bg">
        <Icon name="download" size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Installe Fastattoo</p>
        <p className="text-xs text-muted">Accès en un geste depuis ton écran d&apos;accueil.</p>
      </div>
      <Button size="sm" onClick={install}>
        Installer
      </Button>
      <button type="button" onClick={dismiss} aria-label="Masquer" className="tap -mr-1 inline-flex size-9 items-center justify-center rounded-full text-muted">
        <Icon name="close" size={18} />
      </button>
      {iosSheet}
    </div>
  );
}

/** Entrée « Ajouter à l'écran d'accueil » dans le profil. */
export function InstallRow() {
  const { available, install, iosSheet } = useInstallAction();
  if (!available) return iosSheet;
  return (
    <>
      <button type="button" onClick={install} className="tap flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <Icon name="download" size={22} />
        <span className="flex-1 font-medium">Ajouter à l&apos;écran d&apos;accueil</span>
        <Icon name="chevronRight" size={18} className="text-muted" />
      </button>
      {iosSheet}
    </>
  );
}
