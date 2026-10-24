import { adminConfigured, signInAdmin, signOutAdmin } from "@/lib/accounts/admin-session";
import { checkAdminPassword } from "@/lib/auth/admin";

/** Connexion à la page de validation (mot de passe ADMIN_PASSWORD). */
export async function POST(req: Request) {
  if (!adminConfigured()) return Response.json({ error: "Ajoute la variable ADMIN_PASSWORD (8 caractères minimum) sur Vercel." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  if (!checkAdminPassword(process.env.ADMIN_PASSWORD, body?.password)) {
    await new Promise((r) => setTimeout(r, 600));
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  await signInAdmin();
  return Response.json({ ok: true });
}

export async function DELETE() {
  await signOutAdmin();
  return Response.json({ ok: true });
}
