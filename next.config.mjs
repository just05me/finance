/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {},
  headers: async () => [
    {
      source: "/manifest.webmanifest",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=3600",
        },
      ],
    },
    {
      source: "/(.*).svg",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=604800, immutable",
        },
      ],
    },
  ],
};

export default nextConfig;
