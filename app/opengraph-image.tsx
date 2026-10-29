import { ImageResponse } from "next/og";
import { LOGO_MARK_PATH } from "@/components/layout/Logo";

/** Image d'aperçu quand on partage le site (WhatsApp, Instagram, Messenger…). */
export const alt = "Fastattoo — Trouve ton tatoueur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#151413",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="96" height="96" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="28" fill="#ffffff" />
            <path d={LOGO_MARK_PATH} fillRule="evenodd" transform="translate(50 50) scale(0.78) translate(-50 -50)" fill="#151413" />
          </svg>
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>fastattoo</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>Trouve ton tatoueur.</span>
          <span style={{ fontSize: 36, color: "#cfcac4" }}>Portfolios, styles et demandes de projet en quelques secondes.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#d61f26" }} />
          <span style={{ fontSize: 30, color: "#cfcac4" }}>France · Belgique</span>
        </div>
      </div>
    ),
    size,
  );
}
