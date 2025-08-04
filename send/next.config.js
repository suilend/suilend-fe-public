/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    esmExternals: "loose",
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
}; 