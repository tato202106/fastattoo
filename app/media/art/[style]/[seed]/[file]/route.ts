import { generateArtSvg } from "@/lib/art/generate";
import { parseVariantFile } from "@/lib/images";
import { imageResponse, renderSvgVariant, variantCache } from "@/lib/media/render";
import { isStyleSlug } from "@/lib/styles";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/media/art/[style]/[seed]/[file]">) {
  const { style, seed, file } = await ctx.params;
  const variant = parseVariantFile(file);
  const n = Number(seed);
  if (!variant || !isStyleSlug(style) || !Number.isInteger(n) || n < 0 || n > 1e6) {
    return new Response("Not found", { status: 404 });
  }
  const key = `art:${style}:${n}:${file}`;
  let body = variantCache.get(key);
  if (!body) {
    body = await renderSvgVariant((w) => generateArtSvg(style, n, w), variant.size, variant.format);
    variantCache.set(key, body);
  }
  return imageResponse(body, variant.format);
}
