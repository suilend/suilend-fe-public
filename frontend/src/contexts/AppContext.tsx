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

  lendingMarket: ParsedLendingMarket;
  coinMetadataMap: Record<string, CoinMetadata>;

  reserveMap: Record<string, ParsedReserve>;
  refreshedRawReserves: Reserve<string>[];
  reserveCoinTypes: string[];
  reserveCoinMetadataMap: Record<string, CoinMetadata>;

  rewardPriceMap: Record<string, BigNumber | undefined>;
  rewardCoinTypes: string[];
  activeRewardCoinTypes: string[];
  rewardCoinMetadataMap: Record<string, CoinMetadata>;
}
export type LstAprPercentMap = Record<string, BigNumber>;

interface AppContext {
  suilendClient: SuilendClient | undefined;
  appData: AppData | undefined;
  refreshAppData: () => Promise<void>;
  lstAprPercentMap: LstAprPercentMap | undefined;
}
type LoadedAppContext = AppContext & {
  suilendClient: SuilendClient;
  appData: AppData;
  lstAprPercentMap: LstAprPercentMap;
};

const AppContext = createContext<AppContext>({
  suilendClient: undefined,
  appData: undefined,
  refreshAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },
  lstAprPercentMap: undefined,
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  // App data
  const { data: appData, mutateData: mutateAppData } = useFetchAppData();

  const refreshAppData = useCallback(async () => {
    await mutateAppData();
  }, [mutateAppData]);

  // LST APRs
  const { data: lstAprPercentMap } = useFetchLstAprPercentMap();

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      suilendClient: appData?.suilendClient,
      appData,
      refreshAppData,
      lstAprPercentMap,
    }),
    [appData, refreshAppData, lstAprPercentMap],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
