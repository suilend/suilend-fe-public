import useSWR from "swr";

import { showErrorToast, useSettingsContext } from "@suilend/frontend-sui-next";
import { formatRewards, initializeObligations } from "@suilend/sdk";
import { SuilendClient } from "@suilend/sdk/client";

import { useAppContext } from "@/contexts/AppContext";
import { UserData } from "@/contexts/UserContext";

export default function useFetchUserData(address?: string) {
  const { suiClient } = useSettingsContext();
  const { suilendClient, appData } = useAppContext();

  // Data
  const dataFetcher = async () => {
    if (!suilendClient || !appData) return undefined as unknown as UserData; // In practice `dataFetcher` won't be called if either of these is falsy

    const { obligationOwnerCaps, obligations } = await initializeObligations(
      suiClient,
      suilendClient,
      appData.refreshedRawReserves,
      appData.reserveMap,
      address,
    );

    const rewardMap = formatRewards(
      appData.reserveMap,
      appData.rewardCoinMetadataMap,
      appData.rewardPriceMap,
      obligations,
    );

    const lendingMarketOwnerCapId = !address
      ? undefined
      : await SuilendClient.getLendingMarketOwnerCapId(
          address,
          suilendClient.lendingMarket.$typeArgs,
          suiClient,
        );

    return {
      obligationOwnerCaps,
      obligations,
      rewardMap,

      lendingMarketOwnerCapId,
    };
  };

  const { data, mutate } = useSWR<UserData>(
    !suilendClient || !appData ? null : `userData-${address}`,
    dataFetcher,
    {
      refreshInterval: 30 * 1000,
      onSuccess: (data) => {
        console.log("Refreshed user data", data);
      },
      onError: (err) => {
        showErrorToast(
          "Failed to refresh user data. Please check your internet connection or change RPC providers in Settings.",
          err,
        );
        console.error(err);
      },
    },
  );

  return { data, mutateData: mutate };
}
