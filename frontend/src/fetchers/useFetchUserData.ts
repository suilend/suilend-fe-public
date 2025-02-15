import useSWR from "swr";

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
  const { appData } = useAppContext();

  // Data
  const dataFetcher = async () => {
    if (!appData) return undefined as unknown as UserData; // In practice `dataFetcher` won't be called if `appData` is falsy

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

    return {
      obligationOwnerCaps,
      obligations,
      rewardMap,
    };
  };

  const { data, mutate } = useSWR<UserData>(
    !appData ? null : `userData-${address}`,
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
