const path = require("path");

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    esmExternals: "loose",
  },
  transpilePackages: ["geist", "@suilend/sui-fe-next", "sonner"],
  images: {
    remotePatterns: [
      new URL("https://d29k09wtkr1a3e.cloudfront.net/suilend/**"),
    ],
    qualities: [100],
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
  async redirects() {
    return [
      // Dashboard redirects
      {
        source: "/dashboard/:path*",
        destination: "https://suilend.fi/:path*",
        permanent: true,
      },

      // SEND redirects
      {
        source: "/send/:path*",
        destination: "https://send.suilend.fi/:path*",
        permanent: true,
      },

      // Swap redirects
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "swap.suilend.fi",
          },
        ],
        destination: "https://suilend.fi/swap/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "suil.ag",
          },
        ],
        destination: "https://suilend.fi/swap/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "send.ag",
          },
        ],
        destination: "https://suilend.fi/swap/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};
