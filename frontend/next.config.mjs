/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Build podhum bodhu typescript errors vandhaa ignore pannum
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint warnings-a ignore pannum
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
