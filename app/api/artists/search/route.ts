import { artists } from "@/lib/data";
import { searchQueryFromParams } from "@/lib/search/query-params";

export async function GET(req: Request) {
  const query = searchQueryFromParams(new URL(req.url).searchParams);
  const result = await artists.search(query);
  return Response.json(result, {
    // Les résultats dépendent de la position : jamais en cache partagé.
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
