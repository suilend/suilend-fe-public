import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import useFetchLstAprPercentMap from "@/fetchers/useFetchLstAprPercentMap";

export interface AppData {
  suilendClient: SuilendClient;
  lendingMarketOwnerCapId: string | undefined;

  lendingMarket: ParsedLendingMarket;
  coinMetadataMap: Record<string, CoinMetadata>;

  refreshedRawReserves: Reserve<string>[];
  reserveMap: Record<string, ParsedReserve>;
  filteredReserves: ParsedReserve[];
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

  lstAprPercentMap: LstAprPercentMap | undefined;
}
type LoadedAppContext = AppContext & {
  allAppData: AppData[];

  appData: AppData;

  lstAprPercentMap: LstAprPercentMap;
};

const AppContext = createContext<AppContext>({
  allAppData: undefined,
  refreshAllAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },

  appData: undefined,

  lstAprPercentMap: undefined,
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  // All app data
  const { data: allAppData, mutateData: mutateAllAppData } = useFetchAppData();

  const refreshAllAppData = useCallback(async () => {
    await mutateAllAppData();
  }, [mutateAllAppData]);

  // LST APRs
  const { data: lstAprPercentMap } = useFetchLstAprPercentMap();

  // Lending market
  const appData = useMemo(() => allAppData?.[0], [allAppData]);

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      allAppData,
      refreshAllAppData,

      appData,

      lstAprPercentMap,
    }),
    [allAppData, refreshAllAppData, appData, lstAprPercentMap],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
