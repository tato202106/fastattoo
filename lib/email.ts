import "server-only";

/**
 * Envoi d'un e-mail via Resend (https://resend.com) si RESEND_API_KEY est définie.
 * Expéditeur : SIGNUP_NOTIFY_FROM (domaine vérifié chez Resend), sinon l'adresse
 * de test de Resend, qui n'envoie qu'à l'adresse du compte Resend.
 * Ne lève jamais d'erreur : renvoie false si l'e-mail n'est pas parti.
 */
export async function sendEmail(msg: { to: string | string[]; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[e-mail] RESEND_API_KEY manquante : e-mail non envoyé :", msg.subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.SIGNUP_NOTIFY_FROM || "Fastattoo <onboarding@resend.dev>",
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        reply_to: msg.replyTo,
        subject: msg.subject,
        text: msg.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[e-mail] Resend a refusé l'envoi (${res.status}) : ${await res.text().catch(() => "")}`);
    return res.ok;
  } catch (e) {
    console.error("[e-mail] envoi impossible :", e);
    return false;
  }
}

/** Adresses de l'équipe (SIGNUP_NOTIFY_EMAIL, séparées par des virgules). */
export function teamEmails(): string[] {
  return (process.env.SIGNUP_NOTIFY_EMAIL ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}
