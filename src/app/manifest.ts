import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PetCatch",
    short_name: "PetCatch",
    description:
      "A real-world pet collection game — scan pets, mint playful trading cards, and check in at pet-friendly venues.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff9ec",
    theme_color: "#ffd23f",
    categories: ["games", "lifestyle"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
