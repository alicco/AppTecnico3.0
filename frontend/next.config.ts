import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Disable immutable caching for static assets in dev (avoids stale CSS after rewrite)
  ...(process.env.NODE_ENV === 'development' && {
    headers: async () => [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ],
  }),
};

export default nextConfig;
