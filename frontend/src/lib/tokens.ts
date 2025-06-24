import { CoinMetadata } from "@mysten/sui/client";

export const isInvalidIconUrl = (url?: CoinMetadata["iconUrl"]) => {
  if (url === undefined || url === null) return true;

  // check if URL is malformed
  try {
    new URL(url);
    return false;
  } catch {
    return true;
  }
};
