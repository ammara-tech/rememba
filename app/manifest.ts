import type { MetadataRoute } from "next";

/* Makes Rememba installable: "Add to Home screen" opens it full screen, like an app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rememba",
    short_name: "Rememba",
    description: "Flashcards that show each card just before you'd forget it.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef0f7",
    theme_color: "#3b4cca",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
