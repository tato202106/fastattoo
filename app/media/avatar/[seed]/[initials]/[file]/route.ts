import { generateAvatarSvg } from "@/lib/art/generate";
import { parseVariantFile } from "@/lib/images";
import { imageResponse, renderSvgVariant, variantCache } from "@/lib/media/render";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/media/avatar/[seed]/[initials]/[file]">) {
  const { seed, initials, file } = await ctx.params;
  const variant = parseVariantFile(file);
  const n = Number(seed);
  const text = decodeURIComponent(initials).slice(0, 2);
  if (!variant || !Number.isInteger(n) || n < 0 || n > 1e6 || (variant.size !== "thumbnail" && variant.size !== "small")) {
    return new Response("Not found", { status: 404 });
  }
  const key = `avatar:${n}:${text}:${file}`;
  let body = variantCache.get(key);
  if (!body) {
    body = await renderSvgVariant((w) => generateAvatarSvg(n, text, w), variant.size, variant.format);
    variantCache.set(key, body);
  }
  return imageResponse(body, variant.format);
}
