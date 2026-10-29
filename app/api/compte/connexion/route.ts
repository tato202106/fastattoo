import { findAccountByEmail } from "@/lib/accounts/db";
import { signIn } from "@/lib/accounts/session";
import { verifyPassword } from "@/lib/auth/password";
import { LIMITS } from "@/lib/rate-limit";
import { tooMany } from "@/lib/rate-limit-db";

const WRONG = "E-mail ou mot de passe incorrect.";

/** Connexion à l'espace tatoueur (e-mail + mot de passe). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 160) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  if (!email || !password) return Response.json({ error: WRONG }, { status: 401 });
  if (!process.env.DATABASE_URL) return Response.json({ error: "Connexion indisponible pour le moment." }, { status: 503 });
  const blocked = await tooMany(req, LIMITS.loginIp, [[LIMITS.loginEmail, email]]);
  if (blocked) return blocked;
  try {
    const account = await findAccountByEmail(email);
    if (!account || !verifyPassword(password, account.passwordHash)) {
      // Petit délai : ralentit les essais en rafale.
      await new Promise((r) => setTimeout(r, 400));
      return Response.json({ error: WRONG }, { status: 401 });
    }
    await signIn(account.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[compte] connexion impossible :", e);
    return Response.json({ error: "Connexion impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
