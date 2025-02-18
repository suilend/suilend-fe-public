import { useMemo } from "react";

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

import { AppData } from "@/contexts/AppContext";

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  const isAdmin = useMemo(() => address === ADMIN_ADDRESS, [address]);

  // Data
  const dataFetcher = async () => {
    const result: Record<string, AppData> = {};

    for (const LENDING_MARKET of LENDING_MARKETS) {
      if (LENDING_MARKET.isHidden && !isAdmin) continue;

      const suilendClient = await SuilendClient.initialize(
        LENDING_MARKET.id,
        LENDING_MARKET.type,
        suiClient,
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
  };

  const { data, mutate } = useSWR<Record<string, AppData>>(
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
