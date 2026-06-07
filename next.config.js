/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Disable server-side features for static export
  trailingSlash: true,
  // Ensure all paths are relative for Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
};

module.exports = nextConfig;
