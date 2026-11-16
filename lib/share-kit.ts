/**
 * Kit de partage du tatoueur : lien de son profil, QR code pour le studio,
 * visuel de story et textes prêts à copier. Chaque support a son propre
 * marqueur utm_source pour voir dans Vercel Analytics ce qui ramène des visites.
 */

export type ShareChannel = "qr" | "story" | "bio" | "lien";

export const SHARE_CHANNELS: Record<ShareChannel, string> = {
  qr: "QR code du studio",
  story: "Story Instagram",
  bio: "Lien en bio",
  lien: "Lien partagé",
};

/** Adresse publique du profil, avec le support qui l'a partagée. */
export function profileShareUrl(base: string, slug: string, channel: ShareChannel): string {
  return `${base.replace(/\/+$/, "")}/tatoueurs/${slug}?utm_source=${channel}`;
}

export interface ShareKitArtist {
  name: string;
  studio: string;
  city: string;
  styles: string[];
}

function joinStyles(styles: string[]): string {
  const list = styles.slice(0, 3).map((s) => s.toLowerCase());
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} et ${list.at(-1)}`;
}

/** Textes prêts à copier-coller pour Instagram, TikTok, WhatsApp… */
export function shareTexts(a: ShareKitArtist, links: Record<ShareChannel, string>) {
  const where = a.studio ? `${a.studio}, ${a.city}` : a.city;
  const styles = joinStyles(a.styles);
  return {
    bio: `📍 ${where}${styles ? ` · ${styles}` : ""}\n📅 Rendez-vous et disponibilités 👇\n${links.bio}`,
    story: `Mes disponibilités et mon portfolio sont sur Fastattoo 🖤 Demande ton projet directement en ligne : lien en bio ou ${links.story}`,
    message: `Salut ! Tu peux voir mon travail, mes prochaines dispos et m'envoyer ta demande de projet ici : ${links.lien}`,
    review: `Merci pour ta confiance 🙏 Si tu as 1 minute, laisse-moi un avis sur Fastattoo, ça m'aide énormément : ${links.lien}`,
  };
}
