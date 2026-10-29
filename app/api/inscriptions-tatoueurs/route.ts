import { neon } from "@neondatabase/serverless";
import { createAccount, EmailTakenError, findAccountByEmail } from "@/lib/accounts/db";
import { signIn } from "@/lib/accounts/session";
import { hashPassword, passwordError } from "@/lib/auth/password";
import { LIMITS } from "@/lib/rate-limit";
import { tooMany } from "@/lib/rate-limit-db";
import { parseSignup } from "@/lib/signup";
import { notifySignup } from "@/lib/signup-notify";

/**
 * Enregistre une demande d'inscription tatoueur dans Neon (table artist_signups,
 * créée automatiquement). Consultable dans la console Neon → Tables.
 * Crée aussi le compte tatoueur (e-mail + mot de passe) et le connecte.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Requête invalide" }, { status: 400 });
  // Champ piège invisible : rempli uniquement par les robots.
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true });
  const blocked = await tooMany(req, LIMITS.signup);
  if (blocked) return blocked;

  const parsed = parseSignup(body);
  const pwError = passwordError(body.password);
  if (!parsed.ok || pwError) {
    return Response.json({ errors: { ...(parsed.ok ? {} : parsed.errors), ...(pwError ? { password: pwError } : {}) } }, { status: 422 });
  }
  if (!process.env.DATABASE_URL) return Response.json({ error: "Inscriptions indisponibles pour le moment." }, { status: 503 });

  const s = parsed.value;
  try {
    if (await findAccountByEmail(s.email)) {
      return Response.json({ errors: { email: "Un compte existe déjà avec cet e-mail. Connecte-toi à ton espace tatoueur." }, existingAccount: true }, { status: 409 });
    }
  } catch {
    return Response.json({ error: "Impossible d'enregistrer ton inscription. Réessaie dans un instant." }, { status: 500 });
  }
  let signupId: number | null = null;
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`CREATE TABLE IF NOT EXISTS artist_signups (
      id serial PRIMARY KEY,
      created_at timestamptz NOT NULL DEFAULT now(),
      name text NOT NULL,
      studio text,
      address text,
      city text NOT NULL,
      email text NOT NULL,
      phone text,
      instagram text,
      styles text[] NOT NULL,
      price_from integer,
      message text,
      consent boolean NOT NULL
    )`;
    await sql`ALTER TABLE artist_signups ADD COLUMN IF NOT EXISTS referrer text`;
    await sql`ALTER TABLE artist_signups ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'FR'`;
    const rows = (await sql`INSERT INTO artist_signups (name, studio, address, city, country, email, phone, instagram, styles, price_from, message, consent, referrer)
      VALUES (${s.name}, ${s.studio}, ${s.address}, ${s.city}, ${s.country}, ${s.email}, ${s.phone}, ${s.instagram}, ${s.styles}, ${s.priceFrom}, ${s.message}, ${s.consent}, ${s.referrer})
      RETURNING id`) as { id: number }[];
    signupId = rows[0]?.id ?? null;
  } catch {
    return Response.json({ error: "Impossible d'enregistrer ton inscription. Réessaie dans un instant." }, { status: 500 });
  }
  try {
    const accountId = await createAccount({
      email: s.email,
      passwordHash: hashPassword(String(body.password)),
      signupId,
      name: s.name,
      studio: s.studio,
      address: s.address,
      city: s.city,
      country: s.country,
      styles: s.styles,
      priceFrom: s.priceFrom,
      instagram: s.instagram,
    });
    await signIn(accountId);
  } catch (e) {
    if (e instanceof EmailTakenError) {
      return Response.json({ errors: { email: "Un compte existe déjà avec cet e-mail. Connecte-toi à ton espace tatoueur." }, existingAccount: true }, { status: 409 });
    }
    console.error("[inscription] création du compte impossible :", e);
    return Response.json({ error: "Impossible de créer ton compte. Réessaie dans un instant." }, { status: 500 });
  }
  await notifySignup(s);
  // L'identifiant relie ensuite le paiement (Stripe) à cette inscription.
  return Response.json({ ok: true, signupId });
}
