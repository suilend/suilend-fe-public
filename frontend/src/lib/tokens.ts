import { CoinMetadata } from "@mysten/sui/client";

export const isInvalidIconUrl = (url?: CoinMetadata["iconUrl"]) =>
  !url || url === "" || url === "TODO";
