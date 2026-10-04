import { artists } from "@/lib/data";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const suggestions = await artists.suggest(q, 8);
  return Response.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=300" } });
}
