import BigNumber from "bignumber.js";
import useSWR from "swr";

import {
  LIQUID_STAKING_INFO_MAP,
  NORMALIZED_LST_COINTYPES,
  initializeSuilendSdk,
  showErrorToast,
  useSettingsContext,
} from "@suilend/frontend-sui";
import { SuilendClient } from "@suilend/sdk/client";
import { LstClient } from "@suilend/springsui-sdk";

import { AppData } from "@/contexts/AppContext";

export default function useFetchAppData(address?: string) {
  const { suiClient } = useSettingsContext();

  // Data
  const dataFetcher = async () => {
    const {
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
    } = await initializeSuilendSdk(suiClient, address);

    let lendingMarketOwnerCapId: string | null = null;
    if (address) {
      lendingMarketOwnerCapId = await SuilendClient.getLendingMarketOwnerCapId(
        address,
        suilendClient.lendingMarket.$typeArgs,
        suiClient,
      );
    }

    // LSTs
    const lstAprPercentMap: Record<string, BigNumber> = {};
    for (const lstCoinType of NORMALIZED_LST_COINTYPES) {
      const reserve = reserveMap[lstCoinType];
      if (!reserve) continue;

      const LIQUID_STAKING_INFO = Object.values(LIQUID_STAKING_INFO_MAP).find(
        (info) => info.type === lstCoinType,
      );
      if (!LIQUID_STAKING_INFO) continue;

      const lstClient = await LstClient.initialize(
        suiClient,
        LIQUID_STAKING_INFO,
      );

      const apr = await lstClient.getSpringSuiApy(); // TODO: Use APR
      const aprPercent = new BigNumber(apr).times(100);

      lstAprPercentMap[lstCoinType] = aprPercent;
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
