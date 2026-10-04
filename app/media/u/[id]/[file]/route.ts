import { parseVariantFile } from "@/lib/images";
import { imageResponse, renderBitmapVariant } from "@/lib/media/render";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

const ID_PATTERN = /^[a-z0-9]{16,40}$/;

/**
 * Variantes des images uploadées. Générées à la première demande à partir de
 * l'original, puis conservées dans le stockage (compression automatique).
 */
export async function GET(_req: Request, ctx: RouteContext<"/media/u/[id]/[file]">) {
  const { id, file } = await ctx.params;
  const variant = parseVariantFile(file);
  if (!variant || !ID_PATTERN.test(id)) return new Response("Not found", { status: 404 });

  const store = storage();
  const key = `${id}/${variant.size}.${variant.format}`;
  const cached = await store.get(key);
  if (cached) return imageResponse(cached, variant.format);

  const original = await store.get(`${id}/source`);
  if (!original) return new Response("Not found", { status: 404 });
  const body = await renderBitmapVariant(original, variant.size, variant.format);
  await store.put(key, body);
  return imageResponse(body, variant.format);
}
