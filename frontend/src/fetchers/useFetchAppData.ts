import useSWR from "swr";

import { showErrorToast, useSettingsContext } from "@suilend/frontend-sui-next";
import { initializeSuilend, initializeSuilendRewards } from "@suilend/sdk";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";

import { AppData } from "@/contexts/AppContext";

export default function useFetchAppData() {
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
      coinMetadataMap,

      reserveMap,
      refreshedRawReserves,
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

    return {
      suilendClient,

      lendingMarket,
      coinMetadataMap,

      reserveMap,
      refreshedRawReserves,
      reserveCoinTypes,
      reserveCoinMetadataMap,

      rewardPriceMap,
      rewardCoinTypes,
      activeRewardCoinTypes,
      rewardCoinMetadataMap,
    };
  };

  const { data, mutate } = useSWR<AppData>("appData", dataFetcher, {
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
