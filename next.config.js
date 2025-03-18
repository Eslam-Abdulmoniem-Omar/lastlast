/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "standalone", // Optimizes for deployment
  reactStrictMode: true,
  images: {
    domains: [
      "images.unsplash.com",
      "firebasestorage.googleapis.com",
      "i.ytimg.com",
      "img.youtube.com",
      "lh3.googleusercontent.com",
    ],
    unoptimized: true,
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
  // Increase the memory limit for the build process
  transpilePackages: ["@ai-sdk/anthropic", "@ai-sdk/openai", "undici"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
