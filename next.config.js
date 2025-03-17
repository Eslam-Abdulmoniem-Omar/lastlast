/** @type {import('next').NextConfig} */

const nextConfig = {
  output: "standalone", // Optimizes for deployment
  distDir: "build", // This will create a 'build' folder instead of '.next'
  reactStrictMode: true,
  swcMinify: true,
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
  // Optimize build performance
  experimental: {
    optimizeCss: true, // Enable CSS optimization
    legacyBrowsers: false, // Disable legacy browser support
    browsersListForSwc: true, // Enable SWC browserslist
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
  // Optimize the build process
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 90000,
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: "commons",
              chunks: "all",
              minChunks: 2,
            },
            shared: {
              name: (module, chunks) => {
                return `shared-${chunks.map((c) => c.name).join("-")}`;
              },
              chunks: "all",
              minChunks: 2,
            },
          },
        },
      };
    }
    return config;
  },
  // Increase the memory limit for the build process
  transpilePackages: ["@ai-sdk/anthropic", "@ai-sdk/openai"],
};

module.exports = nextConfig;
