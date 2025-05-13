import { useMemo } from "react";

import BigNumber from "bignumber.js";
import useSWR from "swr";

import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import { initializeSuilend, initializeSuilendRewards } from "@suilend/sdk";
import {
  ADMIN_ADDRESS,
  LENDING_MARKETS,
  SuilendClient,
} from "@suilend/sdk/client";

import { AllAppData, AppContext } from "@/contexts/AppContext";
import { API_URL } from "@/lib/navigation";

export default function useFetchAppData(
  localCoinMetadataMap: AppContext["localCoinMetadataMap"],
  addCoinMetadataToLocalMap: AppContext["addCoinMetadataToLocalMap"],
) {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

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
          } = await initializeSuilend(
            suiClient,
            suilendClient,
            localCoinMetadataMap,
          );
          for (const coinType of Object.keys(coinMetadataMap)) {
            if (!localCoinMetadataMap[coinType])
              addCoinMetadataToLocalMap(coinType, coinMetadataMap[coinType]);
          }

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
          const lstInfoRes = await fetch(`${API_URL}/springsui/lst-info`);
          const lstInfoJson: Record<
            string,
            { LIQUID_STAKING_INFO: any; liquidStakingInfo: any; apy: string }
          > = await lstInfoRes.json();
          if ((lstInfoRes as any)?.statusCode === 500)
            throw new Error("Failed to fetch SpringSui LST data");

          return Object.fromEntries(
            Object.entries(lstInfoJson).map(([coinType, lstData]) => [
              coinType,
              new BigNumber(lstData.apy),
            ]),
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
        console.log("Refreshed app data", data);
      },
      onError: (err) => {
        showErrorToast(
          "Failed to refresh app data. Please check your internet connection or change RPC providers in Settings.",
          err,
        );
        console.error(err);
      },
    },
  );

  return { data, mutateData: mutate };
}
