import { ImageResponse } from "next/og";
import { LOGO_MARK_PATH } from "@/components/layout/Logo";
import { currentAccount } from "@/lib/accounts/session";
import { encodeQr, qrPath } from "@/lib/qr";
import { coverPhotoDataUrl, publicRating, shareKitFor } from "@/lib/share-kit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1080;
const H = 1920;
const INK = "#151413";
const RED = "#d61f26";

/**
 * Visuel de story Instagram/TikTok (1080 × 1920) du tatoueur connecté :
 * sa première photo, son nom, ses styles, sa note et un QR code vers son profil.
 * ?telecharger=1 : téléchargement direct du PNG.
 */
export async function GET(req: Request) {
  const account = await currentAccount();
  if (!account) return new Response("Connecte-toi à ton espace tatoueur.", { status: 401 });

  const kit = await shareKitFor(account);
  const [photo, rating] = await Promise.all([coverPhotoDataUrl(account.id, W - 120, 900), publicRating(kit.slug)]);
  const qr = encodeQr(kit.links.story);
  const qrSize = qr.length;
  const place = [account.studio, account.city].filter(Boolean).join(" · ");
  const ratingLabel = rating ? `★ ${rating.rating.toFixed(1).replace(".", ",")} · ${rating.count} avis` : "Nouveau sur Fastattoo";
  const download = new URL(req.url).searchParams.get("telecharger") === "1";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: INK, color: "#ffffff", padding: "90px 60px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="28" fill="#ffffff" />
            <path d={LOGO_MARK_PATH} fillRule="evenodd" transform="translate(50 50) scale(0.78) translate(-50 -50)" fill={INK} />
          </svg>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>fastattoo</span>
        </div>

        <div
          style={{
            marginTop: 50,
            width: W - 120,
            height: 900,
            borderRadius: 48,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#2a2826",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendu image (next/og), pas une page
            <img src={photo} width={W - 120} height={900} alt="" style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 64, fontWeight: 700, color: "#cfcac4", textAlign: "center", padding: 60 }}>{kit.styles.slice(0, 2).join(" · ") || "Tatouage"}</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
          <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{account.name || "Mon profil"}</span>
          {place && <span style={{ fontSize: 38, color: "#cfcac4", marginTop: 14 }}>{place}</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 24 }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: RED }} />
            <span style={{ fontSize: 34, color: "#ffffff" }}>{ratingLabel}</span>
            {kit.styles.length > 0 && <span style={{ fontSize: 34, color: "#cfcac4" }}>{`· ${kit.styles.slice(0, 2).join(", ")}`}</span>}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 36, background: "#ffffff", color: INK, borderRadius: 40, padding: 32 }}>
          <svg width="300" height="300" viewBox={`-2 -2 ${qrSize + 4} ${qrSize + 4}`}>
            <rect x="-2" y="-2" width={qrSize + 4} height={qrSize + 4} fill="#ffffff" />
            <path d={qrPath(qr)} fill={INK} />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.1 }}>Prends rendez-vous</span>
            <span style={{ fontSize: 32, color: "#5c5752", marginTop: 12, lineHeight: 1.25 }}>Portfolio, dispos et demande de projet : lien en bio ou scanne-moi</span>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "private, no-store",
        ...(download ? { "Content-Disposition": `attachment; filename="fastattoo-story-${kit.slug}.png"` } : {}),
      },
    },
  );
}
