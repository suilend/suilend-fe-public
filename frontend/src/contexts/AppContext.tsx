import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

import {
  NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES,
  NORMALIZED_upSUI_COINTYPE,
  isDeprecated,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";
import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { ADMIN_ADDRESS, SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import useFetchLstAprPercentMap from "@/fetchers/useFetchLstAprPercentMap";

export interface AppData {
  suilendClient: SuilendClient;

  lendingMarket: ParsedLendingMarket;
  coinMetadataMap: Record<string, CoinMetadata>;

  refreshedRawReserves: Reserve<string>[];
  reserveMap: Record<string, ParsedReserve>;
  reserveCoinTypes: string[];
  reserveCoinMetadataMap: Record<string, CoinMetadata>;

  rewardPriceMap: Record<string, BigNumber | undefined>;
  rewardCoinTypes: string[];
  activeRewardCoinTypes: string[];
  rewardCoinMetadataMap: Record<string, CoinMetadata>;
}
export type LstAprPercentMap = Record<string, BigNumber>;

interface AppContext {
  allAppData: AppData[] | undefined;
  refreshAllAppData: () => Promise<void>;

  appData: AppData | undefined;
  filteredReserves: ParsedReserve[] | undefined;

  lstAprPercentMap: LstAprPercentMap | undefined;
}
type LoadedAppContext = AppContext & {
  allAppData: AppData[];

  appData: AppData;
  filteredReserves: ParsedReserve[];

  lstAprPercentMap: LstAprPercentMap;
};

const AppContext = createContext<AppContext>({
  allAppData: undefined,
  refreshAllAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },

  appData: undefined,
  filteredReserves: undefined,

  lstAprPercentMap: undefined,
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();

  // Lending markets
  const { data: allAppData, mutateData: mutateAllAppData } = useFetchAppData();

  const refreshAllAppData = useCallback(async () => {
    await mutateAllAppData();
  }, [mutateAllAppData]);

  const appData = useMemo(() => allAppData?.[0], [allAppData]); // USE MAIN MARKET ONLY FOR NOW

  // Filtered reserves
  const filteredReservesMap = useMemo(() => {
    if (!allAppData) return undefined;

    const result: Record<string, ParsedReserve[]> = {};
    for (const _appData of allAppData) {
      const filteredReserves = _appData.lendingMarket.reserves
        .filter((reserve) =>
          !isInMsafeApp()
            ? true
            : !NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES.includes(
                reserve.coinType,
              ),
        )
        .filter((reserve) => {
          return (
            (reserve.coinType === NORMALIZED_upSUI_COINTYPE &&
              Date.now() >= 1734609600000) || // 2024-12-19 12:00:00 UTC
            isDeprecated(reserve.coinType) || // Always show deprecated reserves
            reserve.config.depositLimit.gt(0) ||
            address === ADMIN_ADDRESS
          );
        });

      result[_appData.lendingMarket.id] = filteredReserves;
    }

    return result;
  }, [allAppData, address]);

  const filteredReserves = useMemo(() => {
    if (!appData) return undefined;
    return filteredReservesMap?.[appData.lendingMarket.id];
  }, [appData, filteredReservesMap]);

  // LST APRs
  const { data: lstAprPercentMap } = useFetchLstAprPercentMap();

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      allAppData,
      refreshAllAppData,

      appData,
      filteredReserves,

      lstAprPercentMap,
    }),
    [
      allAppData,
      refreshAllAppData,
      appData,
      filteredReserves,
      lstAprPercentMap,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
