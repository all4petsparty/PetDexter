import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transformers.js runs in the browser only — keep its Node-side deps
  // (sharp, onnxruntime-node) out of the client bundle (per HF docs)
  serverExternalPackages: ["@huggingface/transformers"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  headers: async () => [
    {
      // Never cache the service worker so PWA updates roll out immediately
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    },
  ],
};

export default nextConfig;
