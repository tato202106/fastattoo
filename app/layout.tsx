import type { Metadata, Viewport } from "next";
import { AppRuntime } from "@/components/layout/AppRuntime";
import { BottomNav } from "@/components/layout/BottomNav";
import { DesktopNav } from "@/components/layout/DesktopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Fastattoo — Trouve ton tatoueur", template: "%s · Fastattoo" },
  description: "Les meilleurs tatoueurs autour de toi. Explore leurs portfolios, choisis ton style et demande ton projet en quelques secondes.",
  applicationName: "Fastattoo",
  appleWebApp: { capable: true, title: "Fastattoo", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg">
          Aller au contenu
        </a>
        <DesktopNav />
        <div id="contenu">{children}</div>
        <BottomNav />
        <AppRuntime />
      </body>
    </html>
  );
}
