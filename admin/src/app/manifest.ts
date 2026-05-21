import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest and auto-linked by Next. Enables installing
// the Fleet Portal as a standalone desktop app via Chrome ("Install app").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HailGuard Fleet Portal",
    short_name: "HailGuard",
    description: "E-hailing zone compliance — admin portal.",
    id: "/admin",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#0d2236",
    theme_color: "#0d2236",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
