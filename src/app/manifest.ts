import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PetDexter",
    short_name: "PetDexter",
    description:
      "A real-world pet collection game — scan pets, mint playful trading cards, and check in at pet-friendly venues.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff9ec",
    theme_color: "#ffd23f",
    categories: ["games", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
