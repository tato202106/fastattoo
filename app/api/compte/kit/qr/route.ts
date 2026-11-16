import { currentAccount } from "@/lib/accounts/session";
import { qrSvg } from "@/lib/qr";
import { shareKitFor } from "@/lib/share-kit-server";

export const dynamic = "force-dynamic";

/** QR code (SVG, net à toutes les tailles) vers le profil du tatoueur connecté, à imprimer pour le studio. */
export async function GET() {
  const account = await currentAccount();
  if (!account) return new Response("Connecte-toi à ton espace tatoueur.", { status: 401 });
  const kit = await shareKitFor(account);
  return new Response(qrSvg(kit.links.qr), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="fastattoo-qr-${kit.slug}.svg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
