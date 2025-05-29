import { useMemo } from "react";

import BigNumber from "bignumber.js";
import useSWR, { useSWRConfig } from "swr";

import { initializeSuilend, initializeSuilendRewards } from "@suilend/sdk";
import {
  ADMIN_ADDRESS,
  LENDING_MARKETS,
  SuilendClient,
} from "@suilend/sdk/client";
import { API_URL } from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import { AllAppData } from "@/contexts/AppContext";

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  const { cache } = useSWRConfig();

  const isAdmin = useMemo(() => address === ADMIN_ADDRESS, [address]);

  // Data
  const dataFetcher = async () => {
    const [allLendingMarketData, lstAprPercentMap] = await Promise.all([
      // Lending markets
      (async () => {
        const result: AllAppData["allLendingMarketData"] = {};

        for (const LENDING_MARKET of LENDING_MARKETS) {
          if (LENDING_MARKET.isHidden && !isAdmin) continue;

          const suilendClient = await SuilendClient.initialize(
            LENDING_MARKET.id,
            LENDING_MARKET.type,
            suiClient,
            true,
          );

          const {
            lendingMarket,
            coinMetadataMap,

            refreshedRawReserves,
            reserveMap,
            reserveCoinTypes,
            reserveCoinMetadataMap,

            rewardCoinTypes,
            activeRewardCoinTypes,
            rewardCoinMetadataMap,
          } = await initializeSuilend(suiClient, suilendClient);

          const { rewardPriceMap } = await initializeSuilendRewards(
            reserveMap,
            activeRewardCoinTypes,
          );

          result[lendingMarket.id] = {
            suilendClient,

            lendingMarket,
            coinMetadataMap,

            refreshedRawReserves,
            reserveMap,
            reserveCoinTypes,
            reserveCoinMetadataMap,

            rewardPriceMap,
            rewardCoinTypes,
            activeRewardCoinTypes,
            rewardCoinMetadataMap,
          };
        }

        return result;
      })(),

      // LSTs (won't throw on error)
      (async () => {
        try {
          const lstAprPercentMapRes = await fetch(`${API_URL}/springsui/all`);
          const lstAprPercentMapJson: Record<string, string> =
            await lstAprPercentMapRes.json();
          if ((lstAprPercentMapRes as any)?.statusCode === 500)
            throw new Error("Failed to fetch SpringSui LST APRs");

          return Object.fromEntries(
            Object.entries(lstAprPercentMapJson).map(
              ([coinType, aprPercent]) => [coinType, new BigNumber(aprPercent)],
            ),
          ) as AllAppData["lstAprPercentMap"];
        } catch (err) {
          console.error(err);
          return {} as AllAppData["lstAprPercentMap"];
        }
      })(),
    ]);

    return { allLendingMarketData, lstAprPercentMap };
  };

  const { data, mutate } = useSWR<AllAppData>(
    `appData-${isAdmin}`,
    dataFetcher,
    {
      refreshInterval: 30 * 1000,
      onSuccess: (data) => {
        console.log("Fetched app data", data);
      },
      onError: (err, key) => {
        const isInitialLoad = cache.get(key)?.data === undefined;
        if (isInitialLoad) showErrorToast("Failed to fetch app data", err);

        console.error(err);
      },
    },
  );

  return { data, mutateData: mutate };
}
