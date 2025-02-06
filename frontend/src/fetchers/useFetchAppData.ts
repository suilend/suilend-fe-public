import BigNumber from "bignumber.js";
import useSWR from "swr";

import { showErrorToast, useSettingsContext } from "@suilend/frontend-sui-next";
import { initializeSuilend, initializeSuilendRewards } from "@suilend/sdk";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import {
  LIQUID_STAKING_INFO_MAP,
  LstClient,
  NORMALIZED_LST_COINTYPES,
} from "@suilend/springsui-sdk";

import { AppData } from "@/contexts/AppContext";

export default function useFetchAppData(address?: string) {
  const { suiClient } = useSettingsContext();

  // Data
  const dataFetcher = async () => {
    // suiClient.getOwnedObjects({
    //   owner: ADMIN_ADDRESS,
    // });

    const suilendClient = await SuilendClient.initialize(
      LENDING_MARKET_ID,
      LENDING_MARKET_TYPE,
      suiClient,
    );

    const {
      lendingMarket,
      reserveMap,

      reserveCoinTypes,
      rewardCoinTypes,

      rewardCoinMetadataMap,
      coinMetadataMap,

      obligationOwnerCaps,
      obligations,
    } = await initializeSuilend(suiClient, suilendClient, address);

    const { rewardPriceMap, rewardMap } = await initializeSuilendRewards(
      reserveMap,
      rewardCoinTypes,
      rewardCoinMetadataMap,
      obligations ?? [],
    );

    let lendingMarketOwnerCapId: string | null = null;
    if (address) {
      lendingMarketOwnerCapId = await SuilendClient.getLendingMarketOwnerCapId(
        address,
        suilendClient.lendingMarket.$typeArgs,
        suiClient,
      );
    }

    // LSTs
    const lstAprPercentMapEntries: [string, BigNumber][] = await Promise.all(
      NORMALIZED_LST_COINTYPES.filter(
        (lstCoinType) =>
          !!reserveMap[lstCoinType] &&
          !!Object.values(LIQUID_STAKING_INFO_MAP).find(
            (info) => info.type === lstCoinType,
          ),
      )
        .map(
          (lstCoinType) =>
            Object.values(LIQUID_STAKING_INFO_MAP).find(
              (info) => info.type === lstCoinType,
            )!,
        )
        .map((LIQUID_STAKING_INFO) =>
          (async () => {
            const lstClient = await LstClient.initialize(
              suiClient,
              LIQUID_STAKING_INFO,
            );

            const apr = await lstClient.getSpringSuiApy(); // TODO: Use APR
            const aprPercent = new BigNumber(apr).times(100);

            return [LIQUID_STAKING_INFO.type, aprPercent];
          })(),
        ),
    );
    const lstAprPercentMap = Object.fromEntries(lstAprPercentMapEntries);

    return {
      suilendClient,

      lendingMarket,
      reserveMap,
      rewardMap,

      reserveCoinTypes,
      rewardCoinTypes,

      coinMetadataMap,
      rewardPriceMap,

      obligationOwnerCaps,
      obligations,
      lendingMarketOwnerCapId: lendingMarketOwnerCapId ?? undefined,

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
