import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
  serverExternalPackages: ["bcryptjs"],
  compiler: {
    // Strip console.* (except error/warn) from the production bundle
    removeConsole: { exclude: ["error", "warn"] },
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
  experimental: {
    viewTransition: true,
    // Tree-shake barrel imports from heavy UI libs → smaller client JS,
    // faster first load / hydration.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
    ],
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "app.neuroidmedia.com",
        "neuroidmedia.com",
      ],
    },
  },
};

export default nextConfig;
