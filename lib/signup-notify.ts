import type { ArtistSignup } from "./signup";
import { styleLabel } from "./styles";

/** Texte de l'e-mail d'alerte envoyé à chaque nouvelle inscription tatoueur. */
export function signupEmail(s: ArtistSignup): { subject: string; text: string } {
  const line = (label: string, value: string | number | null) => (value ? `${label} : ${value}` : null);
  const text = [
    "Nouvelle inscription tatoueur sur Fastattoo",
    "",
    line("Nom", s.name),
    line("Studio", s.studio),
    line("Adresse", s.address),
    line("Ville", s.city),
    line("E-mail", s.email),
    line("Téléphone", s.phone),
    line("Instagram", s.instagram ? `https://instagram.com/${s.instagram}` : ""),
    line("Styles", s.styles.map(styleLabel).join(", ")),
    line("Prix minimum", s.priceFrom ? `${s.priceFrom} €` : null),
    s.message ? `\nMessage :\n${s.message}` : null,
    "",
    "Accord pour l'utilisation des infos et des photos : oui",
    "Toutes les inscriptions : console Neon → Tables → artist_signups",
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject: `Nouvelle inscription : ${s.name} (${s.city})`, text };
}

/**
 * Envoie l'alerte via Resend (https://resend.com) si RESEND_API_KEY et
 * SIGNUP_NOTIFY_EMAIL sont définies. Ne lève jamais d'erreur : l'inscription
 * est déjà enregistrée, l'e-mail n'est qu'un bonus.
 */
export async function notifySignup(s: ArtistSignup): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.SIGNUP_NOTIFY_EMAIL;
  if (!key || !to) {
    console.warn(`[inscription] alerte e-mail désactivée : ${!key ? "RESEND_API_KEY" : "SIGNUP_NOTIFY_EMAIL"} manquante`);
    return;
  }
  const { subject, text } = signupEmail(s);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.SIGNUP_NOTIFY_FROM || "Fastattoo <onboarding@resend.dev>",
        to: to.split(",").map((e) => e.trim()).filter(Boolean),
        reply_to: s.email,
        subject,
        text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[inscription] Resend a refusé l'alerte (${res.status}) : ${await res.text().catch(() => "")}`);
  } catch (e) {
    // Alerte non envoyée : sans conséquence pour l'inscription.
    console.error("[inscription] envoi de l'alerte impossible :", e);
  }
}
