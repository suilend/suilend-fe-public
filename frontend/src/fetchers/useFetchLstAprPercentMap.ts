import BigNumber from "bignumber.js";
import useSWR from "swr";

import { showErrorToast, useSettingsContext } from "@suilend/frontend-sui-next";
import { RESERVES_CUSTOM_ORDER } from "@suilend/sdk";
import {
  LIQUID_STAKING_INFO_MAP,
  LstClient,
  NORMALIZED_LST_COINTYPES,
} from "@suilend/springsui-sdk";

import { LstAprPercentMap } from "@/contexts/AppContext";

export default function useFetchLstAprPercentMap() {
  const { suiClient } = useSettingsContext();

  // Data
  const dataFetcher = async () => {
    const lstAprPercentMapEntries: [string, BigNumber][] = await Promise.all(
      NORMALIZED_LST_COINTYPES.filter(
        (lstCoinType) =>
          RESERVES_CUSTOM_ORDER.includes(lstCoinType) &&
          !!Object.values(LIQUID_STAKING_INFO_MAP).find(
            (info) => info.type === lstCoinType,
          ),
      )
        .map(
          (lstCoinType) =>
            Object.values(LIQUID_STAKING_INFO_MAP).find(
              (info) => info.type === lstCoinType,
            )!,
        )
        .map((LIQUID_STAKING_INFO) =>
          (async () => {
            const lstClient = await LstClient.initialize(
              suiClient,
              LIQUID_STAKING_INFO,
            );

            const apr = await lstClient.getSpringSuiApy(); // TODO: Use APR
            const aprPercent = new BigNumber(apr).times(100);

            return [LIQUID_STAKING_INFO.type, aprPercent];
          })(),
        ),
    );
    const lstAprPercentMap = Object.fromEntries(lstAprPercentMapEntries);

    return lstAprPercentMap;
  };

  const { data, mutate } = useSWR<LstAprPercentMap>(
    "lstAprPercentMap",
    dataFetcher,
    {
      refreshInterval: 1 * 60 * 60 * 1000, // 1 hour
      onSuccess: (data) => {
        console.log("Refreshed LST APRs", data);
      },
      onError: (err) => {
        showErrorToast(
          "Failed to refresh LST APRs. Please check your internet connection or change RPC providers in Settings.",
          err,
        );
        console.error(err);
      },
    },
  );

  return { data, mutateData: mutate };
}
