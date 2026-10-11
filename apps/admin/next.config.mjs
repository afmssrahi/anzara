/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@anzara/ui', '@anzara/config', '@anzara/shared-types', '@anzara/validators'],
};

export default nextConfig;
