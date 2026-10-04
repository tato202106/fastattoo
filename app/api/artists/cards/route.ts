import { artists } from "@/lib/data";

/** Cartes de tatoueurs par identifiants (favoris, recommandations). */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[a-z0-9]{1,12}$/.test(id))
    .slice(0, 60);
  const cards = await artists.getCards(ids);
  return Response.json({ cards }, { headers: { "Cache-Control": "public, max-age=60" } });
}
