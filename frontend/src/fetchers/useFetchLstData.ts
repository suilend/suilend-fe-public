import BigNumber from "bignumber.js";
import useSWR from "swr";

import { showErrorToast, useSettingsContext } from "@suilend/frontend-sui-next";
import { RESERVES_CUSTOM_ORDER } from "@suilend/sdk";
import { LiquidStakingObjectInfo, LstClient } from "@suilend/springsui-sdk";

import { LstData } from "@/contexts/AppContext";
import { SPRINGSUI_ASSETS_URL } from "@/lib/constants";

export default function useFetchLstData() {
  const { suiClient } = useSettingsContext();

  // Data
  const dataFetcher = async () => {
    // LSTs
    let LIQUID_STAKING_INFO_MAP: Record<string, LiquidStakingObjectInfo>;
    try {
      LIQUID_STAKING_INFO_MAP = await (
        await fetch(
          `${SPRINGSUI_ASSETS_URL}/liquid-staking-info-map.json?timestamp=${Date.now()}`,
        )
      ).json();
    } catch (err) {
      LIQUID_STAKING_INFO_MAP = {};
    }

    const lstCoinTypes = Object.values(LIQUID_STAKING_INFO_MAP).map(
      (LIQUID_STAKING_INFO) => LIQUID_STAKING_INFO.type,
    );

    const aprPercentMapEntries: [string, BigNumber][] = await Promise.all(
      Object.values(LIQUID_STAKING_INFO_MAP)
        .filter((LIQUID_STAKING_INFO) =>
          RESERVES_CUSTOM_ORDER.includes(LIQUID_STAKING_INFO.type),
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
    const aprPercentMap = Object.fromEntries(aprPercentMapEntries);

    return {
      lstCoinTypes,
      aprPercentMap,
    };
  };

  const { data, mutate } = useSWR<LstData>("lstData", dataFetcher, {
    refreshInterval: 1 * 60 * 60 * 1000, // 1 hour
    onSuccess: (data) => {
      console.log("Refreshed LST data", data);
    },
    onError: (err) => {
      showErrorToast(
        "Failed to refresh LST data. Please check your internet connection or change RPC providers in Settings.",
        err,
      );
      console.error(err);
    },
  });

  return { data, mutateData: mutate };
}
