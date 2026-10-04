"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { browserPushChannel, registerChannel } from "@/lib/notifications/channels";
import { listenForInstallPrompt } from "@/lib/pwa";
import { useApp } from "@/lib/store/app";

/**
 * Services globaux côté client : chargement de l'état local, canaux de
 * notification, service worker (PWA) et toast des notifications in-app.
 */
export function AppRuntime() {
  useEffect(() => {
    void Promise.resolve(useApp.persist.rehydrate()).then(async () => {
      await useApp.getState().seedDemo();
      useApp.getState().ensureReminders();
    });
    registerChannel(browserPushChannel);
    listenForInstallPrompt();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  return <NotificationToast />;
}

function NotificationToast() {
  const toast = useApp((s) => s.toast);
  const dismiss = useApp((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, 4500);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[calc(var(--safe-top)+8px)]" role="status" aria-live="polite">
      <Link
        href={toast.href}
        onClick={dismiss}
        className="animate-toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-fg px-4 py-3 text-bg shadow-card"
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
          <Icon name="bell" size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{toast.title}</span>
          {toast.body && <span className="block truncate text-xs opacity-75">{toast.body}</span>}
        </span>
      </Link>
    </div>
  );
}
