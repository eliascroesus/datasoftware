/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  eslint: {
    // Linting is run separately in CI; don't fail production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
