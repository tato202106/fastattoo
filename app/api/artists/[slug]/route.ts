import { artists } from "@/lib/data";

export async function GET(_req: Request, ctx: RouteContext<"/api/artists/[slug]">) {
  const { slug } = await ctx.params;
  const artist = await artists.getBySlug(slug);
  if (!artist) return Response.json({ error: "Tatoueur introuvable" }, { status: 404 });
  return Response.json(artist, { headers: { "Cache-Control": "public, max-age=60" } });
}
