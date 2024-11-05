import {
  CoinBalance,
  CoinMetadata,
  CoinStruct,
  SuiClient,
} from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

export type ParsedCoinBalance = {
  coinType: string;
  mintDecimals: number;
  price?: BigNumber;
  symbol: string;
  iconUrl?: string | null;
  balance: BigNumber;
};

export const parseCoinBalances = (
  coinBalances: CoinBalance[],
  uniqueCoinTypes: string[], // Assumed already normalized
  parsedReserveMap?: Record<string, ParsedReserve>,
  coinMetadataMap?: Record<string, CoinMetadata>,
) => {
  return coinBalances.reduce((acc, coinBalance) => {
    const coinType = normalizeStructTag(coinBalance.coinType);
    const reserve = parsedReserveMap?.[coinType];
    const coinMetadata = coinMetadataMap?.[coinType];

    if (uniqueCoinTypes.includes(coinType) && (reserve || coinMetadata)) {
      const mintDecimals = (reserve?.mintDecimals ??
        coinMetadata?.decimals) as number;

      return {
        ...acc,
        [coinType]: {
          coinType,
          mintDecimals,
          price: reserve?.price,
          symbol: reserve?.symbol ?? coinMetadata?.symbol,
          iconUrl: reserve?.iconUrl ?? coinMetadata?.iconUrl,
          balance: new BigNumber(coinBalance.totalBalance).div(
            10 ** mintDecimals,
          ),
        },
      };
    } else return acc;
  }, {}) as Record<string, ParsedCoinBalance>;
};

export async function getAllCoins(
  client: SuiClient,
  owner: string,
): Promise<CoinStruct[]> {
  let cursor = null;
  const allCoins = [];
  while (true) {
    const coins = await client.getAllCoins({ owner, cursor });
    cursor = coins.nextCursor;
    allCoins.push(...coins.data);
    if (!coins.hasNextPage) {
      return allCoins;
    }
  }
}
