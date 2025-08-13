import { Head, Html, Main, NextScript } from "next/document";

import { ASSETS_URL, DESCRIPTION, TITLE, TWITTER } from "@/lib/constants";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content={DESCRIPTION} />
        <link
          rel="icon"
          href={`${ASSETS_URL}/suilend/seo/android-chrome-512x512.png`}
        />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta
          property="og:image"
          content={`${ASSETS_URL}/suilend/seo/android-chrome-512x512.png`}
        />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content={TWITTER} />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={`${ASSETS_URL}/suilend/seo/apple-touch-icon.png`}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={`${ASSETS_URL}/suilend/seo/favicon-32x32.png`}
        />
        <link rel="icon" href={`${ASSETS_URL}/suilend/seo/favicon.ico`} />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={`${ASSETS_URL}/suilend/seo/favicon-16x16.png`}
        />
        <link rel="manifest" href={`${ASSETS_URL}/suilend/seo/site.webmanifest`} />
        <meta name="theme-color" content="#020A19" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
