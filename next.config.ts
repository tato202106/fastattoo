import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      // Les tatoueurs passent par leur vrai espace (compte + abonnement), plus par l'ancien espace de démo.
      { source: "/connexion", has: [{ type: "query", key: "role", value: "artist" }], destination: "/espace-tatoueur/connexion", permanent: false },
      { source: "/pro", destination: "/espace-tatoueur", permanent: false },
      { source: "/pro/:path*", destination: "/espace-tatoueur", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
