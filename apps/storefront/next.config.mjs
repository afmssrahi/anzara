/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@anzara/ui', '@anzara/config', '@anzara/shared-types', '@anzara/validators'],
  experimental: {
    // typedRoutes disabled until routes exist - re-enable in Phase 2
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
