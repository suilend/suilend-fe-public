import useSWR, { useSWRConfig } from "swr";

import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import { formatRewards, initializeObligations } from "@suilend/sdk";

import { useAppContext } from "@/contexts/AppContext";
import { UserData } from "@/contexts/UserContext";

export default function useFetchUserData() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { allAppData } = useAppContext();

  const { cache } = useSWRConfig();

  // Data
  const dataFetcher = async () => {
    if (!allAppData) return undefined as unknown as Record<string, UserData>; // In practice `dataFetcher` won't be called if `allAppData` is falsy

    const result: Record<string, UserData> = {};

    for (const appData of Object.values(allAppData.allLendingMarketData)) {
      const { obligationOwnerCaps, obligations } = await initializeObligations(
        suiClient,
        appData.suilendClient,
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

      result[appData.lendingMarket.id] = {
        obligationOwnerCaps,
        obligations,
        rewardMap,
      };
    }

    return result;
  };

  const { data, mutate } = useSWR<Record<string, UserData>>(
    !allAppData ? null : `userData-${address}`,
    dataFetcher,
    {
      refreshInterval: 30 * 1000,
      onSuccess: (data) => {
        console.log("Fetched user data", data);
      },
      onError: (err, key) => {
        const isInitialLoad = cache.get(key)?.data === undefined;
        if (isInitialLoad) showErrorToast("Failed to fetch user data", err);

        console.error(err);
      },
    },
  );

  return { data, mutateData: mutate };
}
