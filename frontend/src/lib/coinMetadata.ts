import { CoinMetadata, SuiClient } from "@mysten/sui/client";

import {
  COINTYPE_LOGO_MAP,
  COINTYPE_SYMBOL_MAP,
  extractSymbolFromCoinType,
} from "@/lib/coinType";

export const getCoinMetadataMap = async (
  suiClient: SuiClient,
  uniqueCoinTypes: string[], // Assumed already normalized
) => {
  if (uniqueCoinTypes.length === 0) return {};

  try {
    const coinMetadata = await Promise.all(
      uniqueCoinTypes.map((ct) => suiClient.getCoinMetadata({ coinType: ct })),
    );

    const coinMetadataMap: Record<string, CoinMetadata> = {};
    for (let i = 0; i < uniqueCoinTypes.length; i++) {
      const metadata = coinMetadata[i];
      if (!metadata) continue;

      const coinType = uniqueCoinTypes[i];
      const symbol =
        COINTYPE_SYMBOL_MAP[coinType] ??
        metadata?.symbol ??
        extractSymbolFromCoinType(coinType);
      const name = metadata?.name ?? symbol;
      const iconUrl = COINTYPE_LOGO_MAP[coinType] ?? metadata?.iconUrl;

      coinMetadataMap[coinType] = {
        ...metadata,
        symbol,
        name,
        iconUrl,
      };
    }

    return coinMetadataMap;
  } catch (err) {
    console.error(err);
    return {};
  }
};
