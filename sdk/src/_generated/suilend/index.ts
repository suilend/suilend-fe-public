export const PACKAGE_ID =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0x1f54a9a2d71799553197e9ea24557797c6398d6a65f2d4d3818c9304b75d5e21"
    : "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf";
export let PUBLISHED_AT =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0x5bb8cb3894945f523736f4f5059b1621056e8093b165ea56b20805d0ef2461a9"
    : "0xe37cc7bb50fd9b6dbd3873df66fa2c554e973697f50ef97707311dc78bd08444";
export const PKG_V1 =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0x1f54a9a2d71799553197e9ea24557797c6398d6a65f2d4d3818c9304b75d5e21"
    : "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf";
export const PKG_V8 =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0xe5ed361add4433f4d23e56fc0e3bacab39b93592d5e65d508e33fd19ff696669"
    : "0x5b54b47971238403d6ade3c8c2cc75814cb55145a5184af916bb5b12aaf184cb";
export const PKG_V10 =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0xe5ed361add4433f4d23e56fc0e3bacab39b93592d5e65d508e33fd19ff696669"
    : "0xe37cc7bb50fd9b6dbd3873df66fa2c554e973697f50ef97707311dc78bd08444";
export const PKG_V11 =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0xe5ed361add4433f4d23e56fc0e3bacab39b93592d5e65d508e33fd19ff696669"
    : "0xd2a67633ccb8de063163e25bcfca242929caf5cf1a26c2929dab519ee0b8f331";

export function setPublishedAt(publishedAt: string) {
  PUBLISHED_AT = publishedAt;
}
