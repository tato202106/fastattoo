import { neon } from "@neondatabase/serverless";
import { parseSignup } from "@/lib/signup";
import { notifySignup } from "@/lib/signup-notify";

/**
 * Enregistre une demande d'inscription tatoueur dans Neon (table artist_signups,
 * créée automatiquement). Consultable dans la console Neon → Tables.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Requête invalide" }, { status: 400 });
  // Champ piège invisible : rempli uniquement par les robots.
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true });

  const parsed = parseSignup(body);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 422 });
  if (!process.env.DATABASE_URL) return Response.json({ error: "Inscriptions indisponibles pour le moment." }, { status: 503 });

  const s = parsed.value;
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
    const rows = (await sql`INSERT INTO artist_signups (name, studio, address, city, email, phone, instagram, styles, price_from, message, consent, referrer)
      VALUES (${s.name}, ${s.studio}, ${s.address}, ${s.city}, ${s.email}, ${s.phone}, ${s.instagram}, ${s.styles}, ${s.priceFrom}, ${s.message}, ${s.consent}, ${s.referrer})
      RETURNING id`) as { id: number }[];
    signupId = rows[0]?.id ?? null;
  } catch {
    return Response.json({ error: "Impossible d'enregistrer ton inscription. Réessaie dans un instant." }, { status: 500 });
  }
  await notifySignup(s);
  // L'identifiant relie ensuite le paiement (Stripe) à cette inscription.
  return Response.json({ ok: true, signupId });
}
