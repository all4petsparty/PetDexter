import type { Metadata, Viewport } from "next";
import { Baloo_2, Caveat } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  weight: ["400", "500", "600", "700", "800"],
});

// Handwritten script for card names + sticker labels (video-inspired)
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "PetDexter — Catch 'em all, for real!",
  description:
    "Scan real-world pets, collect unique digital trading cards, and check in at pet-friendly spots near you.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PetDexter",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffd23f",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${baloo.variable} ${caveat.variable}`}>
      <body className="font-display antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
