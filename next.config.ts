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
        // Protections de base pour les visiteurs, sur toutes les pages.
        source: "/:path*",
        headers: [
          // Personne ne peut afficher le site dans un cadre invisible (piège à clics).
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // Le navigateur ne devine pas le type d'un fichier (une image reste une image).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Les autres sites voient seulement « fastattoo », pas l'adresse complète de la page.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Position (« autour de toi ») et appareil photo réservés au site ; micro jamais.
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
        ],
      },
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
