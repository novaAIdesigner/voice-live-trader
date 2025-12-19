import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "devblogs.microsoft.com",
        pathname: "/foundry/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
