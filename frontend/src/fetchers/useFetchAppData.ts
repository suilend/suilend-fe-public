import useSWR from "swr";

import { showErrorToast, useSettingsContext } from "@suilend/frontend-sui-next";
import { initializeSuilend, initializeSuilendRewards } from "@suilend/sdk";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";

import { AppData } from "@/contexts/AppContext";

export default function useFetchAppData(address?: string) {
  const { suiClient } = useSettingsContext();

  // Data
  const dataFetcher = async () => {
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
