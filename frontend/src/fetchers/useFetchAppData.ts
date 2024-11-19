import { normalizeStructTag } from "@mysten/sui/utils";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import BigNumber from "bignumber.js";
import useSWR from "swr";

import {
  COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP,
  LIQUID_STAKING_INFO_MAP,
  NORMALIZED_LST_COINTYPES,
  NORMALIZED_SEND_COINTYPE,
  RESERVES_CUSTOM_ORDER,
  formatRewards,
  getCoinMetadataMap,
  isSendPoints,
  showErrorToast,
  useSettingsContext,
} from "@suilend/frontend-sui";
import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import { WAD } from "@suilend/sdk/constants";
import { parseLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { parseObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { toHexString } from "@suilend/sdk/utils";
import * as simulate from "@suilend/sdk/utils/simulate";
import { LstClient } from "@suilend/springsui-sdk";

import { AppData } from "@/contexts/AppContext";

const fetchBirdeyePrice = async (coinType: string) => {
  try {
    const url = `https://public-api.birdeye.so/defi/price?address=${coinType}`;
    const res = await fetch(url, {
      headers: {
        "X-API-KEY": process.env.NEXT_PUBLIC_BIRDEYE_API_KEY as string,
        "x-chain": "sui",
      },
    });
    const json = await res.json();
    return new BigNumber(json.data.value);
  } catch (err) {
    console.error(err);
  }
};

export default function useFetchAppData(address: string | undefined) {
  const { suiClient } = useSettingsContext();

  // Data
  const dataFetcher = async () => {
    const now = Math.floor(Date.now() / 1000);
    const rawLendingMarket = await LendingMarket.fetch(
      suiClient,
      phantom(LENDING_MARKET_TYPE),
      LENDING_MARKET_ID,
    );

    const suilendClient = await SuilendClient.initializeWithLendingMarket(
      rawLendingMarket,
      suiClient,
    );

    const refreshedRawReserves = await simulate.refreshReservePrice(
      rawLendingMarket.reserves.map((r) =>
        simulate.compoundReserveInterest(r, now),
      ),
      new SuiPriceServiceConnection("https://hermes.pyth.network"),
    );

    const reservesWithTemporaryPriceIdentifiers = refreshedRawReserves.filter(
      (r) =>
        `0x${toHexString(r.priceIdentifier.bytes)}` !==
        COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP[normalizeStructTag(r.coinType.name)]
          ?.priceIdentifier,
    );
    for (const reserve of reservesWithTemporaryPriceIdentifiers) {
      let price = new BigNumber(0.01);

      const birdeyePrice = await fetchBirdeyePrice(
        normalizeStructTag(reserve.coinType.name),
      );
      if (birdeyePrice !== undefined) price = birdeyePrice;

      const parsedPrice = BigInt(
        +new BigNumber(price).times(WAD).integerValue(BigNumber.ROUND_DOWN),
      );
      (reserve.price.value as bigint) = parsedPrice;
      (reserve.smoothedPrice.value as bigint) = parsedPrice;
    }

    const reserveCoinTypes: string[] = [NORMALIZED_SEND_COINTYPE];
    const rewardCoinTypes: string[] = [];
    refreshedRawReserves.forEach((r) => {
      reserveCoinTypes.push(normalizeStructTag(r.coinType.name));

      [
        ...r.depositsPoolRewardManager.poolRewards,
        ...r.borrowsPoolRewardManager.poolRewards,
      ].forEach((pr) => {
        if (!pr) return;

        rewardCoinTypes.push(normalizeStructTag(pr.coinType.name));
      });
    });
    const uniqueReservesCoinTypes = Array.from(new Set(reserveCoinTypes));
    const uniqueRewardsCoinTypes = Array.from(new Set(rewardCoinTypes));

    const reserveCoinMetadataMap = await getCoinMetadataMap(
      suiClient,
      uniqueReservesCoinTypes,
    );
    const rewardCoinMetadataMap = await getCoinMetadataMap(
      suiClient,
      uniqueRewardsCoinTypes,
    );
    const coinMetadataMap = {
      ...reserveCoinMetadataMap,
      ...rewardCoinMetadataMap,
    };

    const lendingMarket = parseLendingMarket(
      rawLendingMarket,
      refreshedRawReserves,
      coinMetadataMap,
      now,
    );
    lendingMarket.reserves = lendingMarket.reserves.slice().sort((a, b) => {
      const aCustomOrderIndex = RESERVES_CUSTOM_ORDER.indexOf(a.coinType);
      const bCustomOrderIndex = RESERVES_CUSTOM_ORDER.indexOf(b.coinType);

      if (aCustomOrderIndex > -1 && bCustomOrderIndex > -1)
        return aCustomOrderIndex - bCustomOrderIndex;
      else if (aCustomOrderIndex === -1 && bCustomOrderIndex === -1) return 0;
      else return aCustomOrderIndex > -1 ? -1 : 1;
    });

    const reserveMap = lendingMarket.reserves.reduce(
      (acc, reserve) => ({ ...acc, [reserve.coinType]: reserve }),
      {},
    ) as Record<string, ParsedReserve>;

    let lendingMarketOwnerCapId, obligationOwnerCaps, obligations;
    if (address) {
      lendingMarketOwnerCapId = await SuilendClient.getLendingMarketOwnerCapId(
        address,
        rawLendingMarket.$typeArgs,
        suiClient,
      );

      obligationOwnerCaps = await SuilendClient.getObligationOwnerCaps(
        address,
        rawLendingMarket.$typeArgs,
        suiClient,
      );

      if (obligationOwnerCaps.length > 0) {
        if (obligationOwnerCaps.length > 1) {
          const obligationOwnerCapTimestampsMs = (
            await Promise.all(
              obligationOwnerCaps.map((ownerCap) =>
                suiClient.queryTransactionBlocks({
                  limit: 1,
                  order: "ascending",
                  filter: { ChangedObject: ownerCap.id },
                  options: { showRawInput: true },
                }),
              ),
            )
          ).map((res) =>
            res?.data?.[0]?.timestampMs
              ? +(res.data[0].timestampMs as string)
              : 0,
          );

          const obligationOwnerCapTimestampsMsMap = obligationOwnerCaps.reduce(
            (acc, obligationOwnerCap, index) => ({
              ...acc,
              [obligationOwnerCap.id]: obligationOwnerCapTimestampsMs[index],
            }),
            {} as Record<string, number>,
          );

          obligationOwnerCaps = obligationOwnerCaps
            .slice()
            .sort(
              (a, b) =>
                obligationOwnerCapTimestampsMsMap[a.id] -
                obligationOwnerCapTimestampsMsMap[b.id],
            );
        }

        const rawObligations = await Promise.all(
          obligationOwnerCaps.map((ownerCap) =>
            SuilendClient.getObligation(
              ownerCap.obligationId,
              rawLendingMarket.$typeArgs,
              suiClient,
            ),
          ),
        );

        obligations = rawObligations
          .map((rawObligation) =>
            simulate.refreshObligation(rawObligation, refreshedRawReserves),
          )
          .map((refreshedObligation) =>
            parseObligation(refreshedObligation, reserveMap),
          );
      }
    }

    // Rewards
    const rewardPriceMap: Record<string, BigNumber | undefined> =
      Object.entries(reserveMap).reduce(
        (acc, [coinType, reserve]) => ({ ...acc, [coinType]: reserve.price }),
        {},
      );

    const reservelessRewardsCoinTypes = uniqueRewardsCoinTypes.filter(
      (coinType) => !isSendPoints(coinType) && !reserveMap[coinType],
    );
    const reservelessRewardsBirdeyePrices = await Promise.all(
      reservelessRewardsCoinTypes.map(fetchBirdeyePrice),
    );
    for (let i = 0; i < reservelessRewardsCoinTypes.length; i++) {
      rewardPriceMap[reservelessRewardsCoinTypes[i]] =
        reservelessRewardsBirdeyePrices[i];
    }

    const rewardMap = formatRewards(
      reserveMap,
      rewardCoinMetadataMap,
      rewardPriceMap,
      obligations,
    );

    // LSTs
    const lstAprPercentMap: Record<string, BigNumber> = {};
    for (const lstCoinType of NORMALIZED_LST_COINTYPES) {
      const reserve = reserveMap[lstCoinType];
      if (!reserve) continue;

      const LIQUID_STAKING_INFO = Object.values(LIQUID_STAKING_INFO_MAP).find(
        (info) => info.type === lstCoinType,
      );
      if (!LIQUID_STAKING_INFO) continue;

      const lstClient = await LstClient.initialize(
        suiClient,
        LIQUID_STAKING_INFO,
      );
      const apr = await lstClient.getSpringSuiApy(); // TODO: Use APR
      const aprPercent = new BigNumber(apr).times(100);

      lstAprPercentMap[lstCoinType] = aprPercent;
    }

    return {
      suilendClient,

      lendingMarket,
      lendingMarketOwnerCapId: lendingMarketOwnerCapId ?? undefined,
      reserveMap,
      rewardMap,

      obligationOwnerCaps,
      obligations,

      reserveCoinTypes: uniqueReservesCoinTypes,
      rewardCoinTypes: uniqueRewardsCoinTypes,

      coinMetadataMap,
      rewardPriceMap,

      lstAprPercentMap,
    };
  };

  const { data, mutate } = useSWR<AppData>(`appData-${address}`, dataFetcher, {
    refreshInterval: 30 * 1000,
    onSuccess: (data) => {
      console.log("Refreshed app data", data);
    },
    onError: (err) => {
      showErrorToast(
        "Failed to refresh app data. Please check your internet connection or change RPC providers in Settings.",
        err,
      );
      console.error(err);
    },
  });

  return { data, mutateData: mutate };
}
