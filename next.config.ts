import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/products",
        destination: "/dashboard/inventory",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
