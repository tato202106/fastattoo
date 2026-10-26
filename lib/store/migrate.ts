/**
 * Nettoyage de l'état local des visiteurs.
 *
 * Jusqu'à la version 1, chaque visiteur recevait des données de démonstration
 * (demandes, conversations, rendez-vous et notifications avec Léa Ink, Sofia…)
 * présentées comme les siennes. Ces éléments sont retirés ; ce que le visiteur
 * a créé lui-même (identifiants générés, avec un tiret) est conservé.
 */
const DEMO_IDS = /^(r[1-8]|c-r[1-8]|ap[1-4]|n[1-6])$/;
const COLLECTIONS = ["requests", "conversations", "appointments", "notifications"] as const;

export function withoutDemoData<T>(state: T): T {
  if (!state || typeof state !== "object") return state;
  const next: Record<string, unknown> = { ...(state as Record<string, unknown>) };
  for (const key of COLLECTIONS) {
    const list = next[key];
    if (Array.isArray(list)) next[key] = list.filter((item) => !DEMO_IDS.test(String((item as { id?: unknown })?.id ?? "")));
  }
  return next as T;
}
