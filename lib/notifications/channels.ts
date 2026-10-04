import type { AppNotification } from "../store/model";

/**
 * Canaux de diffusion des notifications (SPEC §25).
 * - in-app : géré par le store (liste + toast), toujours actif ;
 * - push navigateur : branché ici, actif seulement si l'utilisateur l'a
 *   autorisé et que l'onglet est en arrière-plan.
 * Pour du push natif (serveur → Web Push / APNs / FCM), ajouter un canal qui
 * appelle l'API d'envoi ; le service worker gère déjà l'événement `push`.
 */
export interface NotificationChannel {
  name: string;
  deliver(notification: AppNotification): void | Promise<void>;
}

const channels: NotificationChannel[] = [];

export function registerChannel(channel: NotificationChannel) {
  if (!channels.some((c) => c.name === channel.name)) channels.push(channel);
}

export function dispatchExternal(notification: AppNotification) {
  for (const c of channels) {
    try {
      void c.deliver(notification);
    } catch {
      // Un canal en échec ne doit jamais bloquer l'app.
    }
  }
}

export const browserPushChannel: NotificationChannel = {
  name: "browser-push",
  async deliver(n) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || document.visibilityState === "visible") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.showNotification(n.title, { body: n.body, tag: n.id, data: { href: n.href }, icon: "/icons/icon-192.png", badge: "/icons/badge-72.png" });
  },
};

export async function requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
