import { listPublicFlashes } from "@/lib/accounts/flashes-db";
import { accountIdFromArtistId } from "@/lib/requests/model";

export const runtime = "nodejs";

/** Flashs disponibles ou réservés d'un vrai tatoueur en ligne (?artiste=acc-12). */
export async function GET(req: Request) {
  const accountId = accountIdFromArtistId(new URL(req.url).searchParams.get("artiste"));
  if (accountId == null || !process.env.DATABASE_URL) return Response.json({ flashes: [] });
  try {
    const flashes = await listPublicFlashes(accountId);
    return Response.json({ flashes }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("[flashs] lecture publique impossible :", e);
    return Response.json({ flashes: [] });
  }
}
