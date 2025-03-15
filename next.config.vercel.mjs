/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript type checking in the build process
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint in the build process
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Original settings from next.config.mjs
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "www.youtube.com",
      },
      {
        protocol: "https",
        hostname: "youtube.com",
      },
      {
        protocol: "https",
        hostname: "youtu.be",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add this to prevent the warning about Next.js caching
  experimental: {
    serverMinification: true,
    serverSourceMaps: false,
  },
  // Enable React strict mode
  reactStrictMode: true,
  swcMinify: true,
};

export default nextConfig;
