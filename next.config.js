/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-leaflet'],
  experimental: {
    webpackBuildWorker: false,
  },
};

module.exports = nextConfig;
