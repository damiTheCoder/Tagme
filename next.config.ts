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
        source: "/b/:slug",
        destination: "/:slug",
        permanent: true,
      },
      {
        source: "/b/:slug/:path*",
        destination: "/:slug/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/products",
        destination: "/dashboard/inventory",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
