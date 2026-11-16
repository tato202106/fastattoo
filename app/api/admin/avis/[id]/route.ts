import { isAdmin } from "@/lib/accounts/admin-session";
import { setReviewHidden } from "@/lib/accounts/reviews-db";

/** Modération : retirer un avis du site (insultant, faux…) ou le remettre. */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/avis/[id]">) {
  if (!(await isAdmin())) return Response.json({ error: "Accès refusé" }, { status: 401 });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Avis invalide" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action !== "hide" && body?.action !== "show") return Response.json({ error: "Action inconnue" }, { status: 400 });
  try {
    const review = await setReviewHidden(id, body.action === "hide");
    if (!review) return Response.json({ error: "Avis introuvable" }, { status: 404 });
    return Response.json({ ok: true, review });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
