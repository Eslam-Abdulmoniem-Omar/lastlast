/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "lh3.googleusercontent.com", // Google profile pictures
      "img.youtube.com", // YouTube thumbnails
      "i.ytimg.com", // YouTube thumbnails alternative domain
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
};

export default nextConfig;
