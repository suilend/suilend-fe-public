import useSWR from "swr";

import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import { initializeSuilend, initializeSuilendRewards } from "@suilend/sdk";
import { LENDING_MARKETS, SuilendClient } from "@suilend/sdk/client";

import { AppData } from "@/contexts/AppContext";

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  // Data
  const dataFetcher = async () => {
    const result: AppData[] = [];

    for (const LENDING_MARKET of LENDING_MARKETS) {
      if (LENDING_MARKET.isHidden) continue;

      const suilendClient = await SuilendClient.initialize(
        LENDING_MARKET.id,
        LENDING_MARKET.type,
        suiClient,
      );

      const lendingMarketOwnerCapId = !address
        ? undefined
        : await SuilendClient.getLendingMarketOwnerCapId(
            address,
            suilendClient.lendingMarket.$typeArgs,
            suiClient,
          );

      const {
        lendingMarket,
        coinMetadataMap,

        refreshedRawReserves,
        reserveMap,
        filteredReserves,
        reserveCoinTypes,
        reserveCoinMetadataMap,

        rewardCoinTypes,
        activeRewardCoinTypes,
        rewardCoinMetadataMap,
      } = await initializeSuilend(
        suiClient,
        suilendClient,
        !!lendingMarketOwnerCapId,
      );

      const { rewardPriceMap } = await initializeSuilendRewards(
        reserveMap,
        activeRewardCoinTypes,
      );

      result.push({
        suilendClient,
        lendingMarketOwnerCapId,

        lendingMarket,
        coinMetadataMap,

        refreshedRawReserves,
        reserveMap,
        filteredReserves,
        reserveCoinTypes,
        reserveCoinMetadataMap,

        rewardPriceMap,
        rewardCoinTypes,
        activeRewardCoinTypes,
        rewardCoinMetadataMap,
      });
    }

    return result;
  };

  const { data, mutate } = useSWR<AppData[]>("appData", dataFetcher, {
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
