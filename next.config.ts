import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for shared hosting deployment
  output: 'export',

  // Add trailing slashes for proper routing on static hosts
  trailingSlash: true,

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },

  // Base path if deploying to a subdirectory (uncomment if needed)
  // basePath: '/mobile',
};

export default nextConfig;
