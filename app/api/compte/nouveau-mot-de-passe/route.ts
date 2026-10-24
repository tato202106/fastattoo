import { resetPassword } from "@/lib/accounts/db";
import { signIn } from "@/lib/accounts/session";
import { hashPassword, isTokenFormat, passwordError } from "@/lib/auth/password";

/** Nouveau mot de passe à partir du lien reçu par e-mail, puis connexion. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const error = passwordError(body?.password);
  if (error) return Response.json({ error }, { status: 422 });
  const token = body?.token;
  if (!isTokenFormat(token)) return Response.json({ error: "Lien invalide. Redemande un e-mail." }, { status: 400 });
  try {
    const accountId = await resetPassword(token, hashPassword(String(body?.password)));
    if (!accountId) return Response.json({ error: "Ce lien a expiré ou a déjà servi. Redemande un e-mail." }, { status: 400 });
    await signIn(accountId);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[compte] nouveau mot de passe :", e);
    return Response.json({ error: "Enregistrement impossible. Réessaie dans un instant." }, { status: 500 });
  }
}
