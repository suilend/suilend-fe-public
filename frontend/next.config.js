/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    esmExternals: "loose",
  },
  transpilePackages: ["geist", "@suilend/sui-fe-next"],
  images: {
    remotePatterns: [
      new URL("https://d29k09wtkr1a3e.cloudfront.net/suilend/**"),
    ],
    qualities: [100],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };

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
};
