const path = require("path");

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    esmExternals: "loose",
  },
  webpack: (config, { isServer }) => {
    // CRITICAL: Force all React imports to use the same instance
    // Alias to the package DIRECTORY (not entry file) so react/jsx-dev-runtime works
    const reactDir = path.dirname(require.resolve("react/package.json"));
    const reactDomDir = path.dirname(require.resolve("react-dom/package.json"));

    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactDir,
      "react-dom": reactDomDir,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    return config;
  },
  images: {
    remotePatterns: [new URL("https://d29k09wtkr1a3e.cloudfront.net/**")],
  },
  async headers() {
    return [
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Strict-Transport-Security",
        value: "max-age=31536000",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
    ];
  },
};
