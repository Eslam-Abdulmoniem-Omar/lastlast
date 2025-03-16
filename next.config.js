/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "standalone", // Optimizes for deployment
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      "images.unsplash.com",
      "firebasestorage.googleapis.com",
      "i.ytimg.com",
      "img.youtube.com",
    ],
  },
  // Disable some features in development to reduce confusion
  experimental: {
    serverActions: true,
  },
  // Add headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
  // Environment variables to expose to the browser
  env: {
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  },
};

module.exports = nextConfig;
