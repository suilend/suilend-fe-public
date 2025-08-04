import localFont from "next/font/local";

import { GeistSans } from "geist/font/sans";

const ppSupplyFont = localFont({
  variable: "--supply",
  src: [
    {
      path: "../styles/fonts/PPSupplySans-Ultralight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../styles/fonts/PPSupplySans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../styles/fonts/PPSupplySans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
});

const ppSupplyMonoFont = localFont({
  variable: "--supply-mono",
  src: [
    {
      path: "../styles/fonts/PPSupplyMono-Ultralight.woff2",
      weight: "200",
      style: "mono",
    },
    {
      path: "../styles/fonts/PPSupplyMono-Regular.woff2",
      weight: "400",
      style: "mono",
    },
    {
      path: "../styles/fonts/PPSupplyMono-Medium.woff2",
      weight: "500",
      style: "mono",
    },
    {
      path: "../styles/fonts/PPSupplyMono-Bold.woff2",
      weight: "700",
      style: "mono",
    },
  ],
});

export const fontClassNames = [
  ppSupplyMonoFont.className,
  GeistSans.variable,
  ppSupplyFont.variable,
  ppSupplyMonoFont.variable,
];
